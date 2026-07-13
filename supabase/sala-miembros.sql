-- =============================================================================
-- Salas privadas: dueño, miembros, invite_token (QR), RLS por membresía
-- =============================================================================
-- EJECUTAR EN SUPABASE → SQL Editor (una sola vez, todo el archivo).
-- Después: paso opcional de limpieza de salas viejas (ver final del archivo).
-- =============================================================================

-- 1) Columnas nuevas en salas
ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS invite_token uuid;

UPDATE public.salas
SET invite_token = gen_random_uuid()
WHERE invite_token IS NULL;

ALTER TABLE public.salas
  ALTER COLUMN invite_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS salas_invite_token_uidx
  ON public.salas (invite_token)
  WHERE invite_token IS NOT NULL;

-- Si ya no quedan nulls, endurecer:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.salas WHERE invite_token IS NULL
  ) THEN
    ALTER TABLE public.salas ALTER COLUMN invite_token SET NOT NULL;
  END IF;
END $$;

-- 2) Tabla de miembros
CREATE TABLE IF NOT EXISTS public.sala_miembros (
  sala_id bigint NOT NULL REFERENCES public.salas (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sala_id, user_id)
);

CREATE INDEX IF NOT EXISTS sala_miembros_user_id_idx
  ON public.sala_miembros (user_id);

ALTER TABLE public.sala_miembros ENABLE ROW LEVEL SECURITY;

-- 3) Helpers (SECURITY DEFINER evita recursión de RLS)
CREATE OR REPLACE FUNCTION public.es_miembro_sala(p_sala_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sala_miembros sm
    WHERE sm.sala_id = p_sala_id
      AND sm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.es_owner_sala(p_sala_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sala_miembros sm
    WHERE sm.sala_id = p_sala_id
      AND sm.user_id = auth.uid()
      AND sm.rol = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.es_miembro_sala(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_owner_sala(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_miembro_sala(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_owner_sala(bigint) TO authenticated;

-- 4) Triggers: al crear sala → dueño + fila owner
CREATE OR REPLACE FUNCTION public.salas_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creado_por IS NULL THEN
    NEW.creado_por := auth.uid();
  END IF;

  IF NEW.creado_por IS NULL THEN
    RAISE EXCEPTION 'Debés estar autenticado para crear una sala';
  END IF;

  IF auth.uid() IS NOT NULL AND NEW.creado_por IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'creado_por debe ser el usuario autenticado';
  END IF;

  IF NEW.invite_token IS NULL THEN
    NEW.invite_token := gen_random_uuid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_salas_before_insert ON public.salas;
CREATE TRIGGER trg_salas_before_insert
  BEFORE INSERT ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.salas_before_insert();

CREATE OR REPLACE FUNCTION public.salas_after_insert_miembro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sala_miembros (sala_id, user_id, rol)
  VALUES (NEW.id, NEW.creado_por, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_salas_after_insert_miembro ON public.salas;
CREATE TRIGGER trg_salas_after_insert_miembro
  AFTER INSERT ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.salas_after_insert_miembro();

-- 5) RPC: unirse por token (QR / link)
CREATE OR REPLACE FUNCTION public.unirse_a_sala_por_token(p_token uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sala_id bigint;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión para unirte a una sala';
  END IF;

  IF p_token IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  SELECT s.id INTO v_sala_id
  FROM public.salas s
  WHERE s.invite_token = p_token;

  IF v_sala_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido o vencido';
  END IF;

  INSERT INTO public.sala_miembros (sala_id, user_id, rol)
  VALUES (v_sala_id, v_uid, 'member')
  ON CONFLICT (sala_id, user_id) DO NOTHING;

  RETURN v_sala_id;
END;
$$;

-- 6) RPC: owner agrega por email (solo cuentas registradas)
CREATE OR REPLACE FUNCTION public.agregar_miembro_por_email(p_sala_id bigint, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target uuid;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  IF NOT public.es_owner_sala(p_sala_id) THEN
    RAISE EXCEPTION 'Solo el creador puede sumar miembros';
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Indicá un email';
  END IF;

  SELECT u.id INTO v_target
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Ese email no tiene cuenta en CantemosTodos';
  END IF;

  IF v_target = v_uid THEN
    RAISE EXCEPTION 'Ya sos el creador de esta sala';
  END IF;

  INSERT INTO public.sala_miembros (sala_id, user_id, rol)
  VALUES (p_sala_id, v_target, 'member')
  ON CONFLICT (sala_id, user_id) DO NOTHING;

  RETURN v_target;
END;
$$;

-- 7) RPC: owner elimina miembro
CREATE OR REPLACE FUNCTION public.eliminar_miembro_sala(p_sala_id bigint, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rol text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  IF NOT public.es_owner_sala(p_sala_id) THEN
    RAISE EXCEPTION 'Solo el creador puede eliminar miembros';
  END IF;

  IF p_user_id = v_uid THEN
    RAISE EXCEPTION 'No podés eliminarte a vos mismo como creador';
  END IF;

  SELECT sm.rol INTO v_rol
  FROM public.sala_miembros sm
  WHERE sm.sala_id = p_sala_id AND sm.user_id = p_user_id;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'Esa persona no pertenece a la sala';
  END IF;

  IF v_rol = 'owner' THEN
    RAISE EXCEPTION 'No se puede eliminar al creador';
  END IF;

  DELETE FROM public.sala_miembros
  WHERE sala_id = p_sala_id AND user_id = p_user_id;
END;
$$;

-- 8) RPC: owner rota el token (invalida QR viejos)
CREATE OR REPLACE FUNCTION public.rotar_invite_token_sala(p_sala_id bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  IF NOT public.es_owner_sala(p_sala_id) THEN
    RAISE EXCEPTION 'Solo el creador puede rotar el código';
  END IF;

  UPDATE public.salas
  SET invite_token = v_token
  WHERE id = p_sala_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala no encontrada';
  END IF;

  RETURN v_token;
END;
$$;

-- 9) RPC: listar miembros (nombre/avatar) de salas propias/invitadas
CREATE OR REPLACE FUNCTION public.listar_miembros_salas(p_sala_ids bigint[] DEFAULT NULL)
RETURNS TABLE (
  sala_id bigint,
  user_id uuid,
  rol text,
  nombre text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.sala_id,
    sm.user_id,
    sm.rol,
    COALESCE(
      NULLIF(trim(u.raw_user_meta_data ->> 'nombre'), ''),
      split_part(COALESCE(u.email, ''), '@', 1),
      'Usuario'
    )::text AS nombre,
    NULLIF(trim(u.raw_user_meta_data ->> 'avatar_url'), '')::text AS avatar_url
  FROM public.sala_miembros sm
  JOIN auth.users u ON u.id = sm.user_id
  WHERE public.es_miembro_sala(sm.sala_id)
    AND (p_sala_ids IS NULL OR sm.sala_id = ANY (p_sala_ids))
  ORDER BY sm.sala_id, sm.rol DESC, sm.joined_at;
END;
$$;

-- 10) RPC: obtener invite_token (solo miembros; UI lo usa para QR)
CREATE OR REPLACE FUNCTION public.obtener_invite_token_sala(p_sala_id bigint)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  IF NOT public.es_miembro_sala(p_sala_id) THEN
    RAISE EXCEPTION 'No pertenecés a esta sala';
  END IF;

  SELECT s.invite_token INTO v_token
  FROM public.salas s
  WHERE s.id = p_sala_id;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.unirse_a_sala_por_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agregar_miembro_por_email(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_miembro_sala(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotar_invite_token_sala(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listar_miembros_salas(bigint[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_invite_token_sala(bigint) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.unirse_a_sala_por_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agregar_miembro_por_email(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_miembro_sala(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotar_invite_token_sala(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_miembros_salas(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_invite_token_sala(bigint) TO authenticated;

-- 11) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_miembros TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.salas TO authenticated;

-- 12) RLS salas (reemplaza políticas abiertas)
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth lee salas" ON public.salas;
DROP POLICY IF EXISTS "auth escribe salas" ON public.salas;
DROP POLICY IF EXISTS "auth actualiza salas" ON public.salas;
DROP POLICY IF EXISTS "miembros leen salas" ON public.salas;
DROP POLICY IF EXISTS "auth inserta salas" ON public.salas;
DROP POLICY IF EXISTS "owner actualiza salas" ON public.salas;

CREATE POLICY "miembros leen salas"
  ON public.salas
  FOR SELECT
  TO authenticated
  USING (public.es_miembro_sala(id));

CREATE POLICY "auth inserta salas"
  ON public.salas
  FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

CREATE POLICY "owner actualiza salas"
  ON public.salas
  FOR UPDATE
  TO authenticated
  USING (public.es_owner_sala(id))
  WITH CHECK (public.es_owner_sala(id));

-- 13) RLS sala_miembros
DROP POLICY IF EXISTS "miembros leen sala_miembros" ON public.sala_miembros;
DROP POLICY IF EXISTS "owner borra sala_miembros" ON public.sala_miembros;

CREATE POLICY "miembros leen sala_miembros"
  ON public.sala_miembros
  FOR SELECT
  TO authenticated
  USING (public.es_miembro_sala(sala_id));

-- Inserts solo vía RPCs (security definer). Sin policy INSERT = denegado.
CREATE POLICY "owner borra sala_miembros"
  ON public.sala_miembros
  FOR DELETE
  TO authenticated
  USING (
    public.es_owner_sala(sala_id)
    AND user_id <> auth.uid()
    AND rol = 'member'
  );

-- 14) RLS cola_juntada por membresía
DROP POLICY IF EXISTS "auth lee cola" ON public.cola_juntada;
DROP POLICY IF EXISTS "auth escribe cola" ON public.cola_juntada;
DROP POLICY IF EXISTS "auth modifica cola" ON public.cola_juntada;
DROP POLICY IF EXISTS "auth borra cola" ON public.cola_juntada;

CREATE POLICY "auth lee cola"
  ON public.cola_juntada
  FOR SELECT
  TO authenticated
  USING (public.es_miembro_sala(sala_id));

CREATE POLICY "auth escribe cola"
  ON public.cola_juntada
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_miembro_sala(sala_id));

CREATE POLICY "auth modifica cola"
  ON public.cola_juntada
  FOR UPDATE
  TO authenticated
  USING (public.es_miembro_sala(sala_id))
  WITH CHECK (public.es_miembro_sala(sala_id));

CREATE POLICY "auth borra cola"
  ON public.cola_juntada
  FOR DELETE
  TO authenticated
  USING (public.es_miembro_sala(sala_id));

-- 15) RLS sesion_sala por membresía
DROP POLICY IF EXISTS "auth lee sesion" ON public.sesion_sala;
DROP POLICY IF EXISTS "auth modifica sesion" ON public.sesion_sala;
DROP POLICY IF EXISTS "auth escribe sesion" ON public.sesion_sala;
DROP POLICY IF EXISTS "auth inserta sesion" ON public.sesion_sala;

CREATE POLICY "auth lee sesion"
  ON public.sesion_sala
  FOR SELECT
  TO authenticated
  USING (public.es_miembro_sala(sala_id));

CREATE POLICY "auth escribe sesion"
  ON public.sesion_sala
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_miembro_sala(sala_id));

CREATE POLICY "auth modifica sesion"
  ON public.sesion_sala
  FOR UPDATE
  TO authenticated
  USING (public.es_miembro_sala(sala_id))
  WITH CHECK (public.es_miembro_sala(sala_id));

-- 16) RLS canciones_guardadas: personal/global (sala_id null) vs sala (miembro)
DROP POLICY IF EXISTS "auth lee guardadas" ON public.canciones_guardadas;
DROP POLICY IF EXISTS "auth escribe guardadas" ON public.canciones_guardadas;
DROP POLICY IF EXISTS "auth inserta guardadas" ON public.canciones_guardadas;
DROP POLICY IF EXISTS "auth modifica guardadas" ON public.canciones_guardadas;
DROP POLICY IF EXISTS "auth borra guardadas" ON public.canciones_guardadas;
DROP POLICY IF EXISTS "auth elimina guardadas" ON public.canciones_guardadas;

CREATE POLICY "auth lee guardadas"
  ON public.canciones_guardadas
  FOR SELECT
  TO authenticated
  USING (
    sala_id IS NULL
    OR public.es_miembro_sala(sala_id)
  );

CREATE POLICY "auth inserta guardadas"
  ON public.canciones_guardadas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      sala_id IS NOT NULL
      AND public.es_miembro_sala(sala_id)
    )
    OR (
      sala_id IS NULL
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE
  TO authenticated
  USING (
    (
      sala_id IS NOT NULL
      AND public.es_miembro_sala(sala_id)
    )
    OR (
      sala_id IS NULL
      AND auth.uid() = user_id
    )
  )
  WITH CHECK (
    (
      sala_id IS NOT NULL
      AND public.es_miembro_sala(sala_id)
    )
    OR (
      sala_id IS NULL
      AND auth.uid() = user_id
    )
  );

CREATE POLICY "auth elimina guardadas"
  ON public.canciones_guardadas
  FOR DELETE
  TO authenticated
  USING (
    (
      sala_id IS NOT NULL
      AND public.es_miembro_sala(sala_id)
    )
    OR (
      sala_id IS NULL
      AND auth.uid() = user_id
    )
  );

-- =============================================================================
-- PASO OPCIONAL (ejecutar DESPUÉS si querés limpiar salas de prueba viejas)
-- =============================================================================
-- Las salas SIN creado_por y SIN filas en sala_miembros quedan invisibles para todos.
-- Opción A — borrar salas huérfanas (recomendado si son de prueba):
--
--   DELETE FROM public.salas
--   WHERE creado_por IS NULL
--     AND NOT EXISTS (
--       SELECT 1 FROM public.sala_miembros sm WHERE sm.sala_id = salas.id
--     );
--
-- Opción B — asignarte como dueño (reemplazá el UUID por el tuyo en
--   Authentication → Users → copiar User UID):
--
--   UPDATE public.salas
--   SET creado_por = 'TU-USER-UUID-AQUI'
--   WHERE creado_por IS NULL;
--
--   INSERT INTO public.sala_miembros (sala_id, user_id, rol)
--   SELECT s.id, s.creado_por, 'owner'
--   FROM public.salas s
--   WHERE s.creado_por IS NOT NULL
--   ON CONFLICT DO NOTHING;
--
-- Después de A o B, podés endurecer la columna:
--
--   ALTER TABLE public.salas
--     ALTER COLUMN creado_por SET NOT NULL;
-- =============================================================================
