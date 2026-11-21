-- Superamigos: editan cualquier canción del Cancionero y borran solo las suyas.
-- El dueño sigue siendo el único que borra canciones ajenas, administra usuarios
-- y quita una validación puesta por otro.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'usuarios_categorias'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.usuarios_categorias DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.usuarios_categorias
  ADD CONSTRAINT usuarios_categorias_categoria_check
  CHECK (categoria IN ('dueno', 'superamigos', 'amigos', 'publico'));

DROP POLICY IF EXISTS "auth inserta guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth inserta guardadas"
  ON public.canciones_guardadas
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      sala_id IS NULL
      AND user_id = (SELECT auth.uid())
      AND (SELECT public.categoria_usuario_actual()) IN ('dueno', 'superamigos', 'amigos')
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

DROP POLICY IF EXISTS "auth modifica guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE TO authenticated
  USING (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (SELECT public.categoria_usuario_actual()) = 'superamigos'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) = 'amigos'
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  )
  WITH CHECK (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (SELECT public.categoria_usuario_actual()) = 'superamigos'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) = 'amigos'
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

DROP POLICY IF EXISTS "auth elimina guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth elimina guardadas"
  ON public.canciones_guardadas
  FOR DELETE TO authenticated
  USING (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) IN ('superamigos', 'amigos')
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

CREATE OR REPLACE FUNCTION public.proteger_dueno_cancion_guardada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND (SELECT public.categoria_usuario_actual()) IS DISTINCT FROM 'dueno' THEN
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_dueno_cancion_guardada() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_dueno_cancion_guardada ON public.canciones_guardadas;
CREATE TRIGGER trg_proteger_dueno_cancion_guardada
  BEFORE UPDATE ON public.canciones_guardadas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_dueno_cancion_guardada();

CREATE OR REPLACE FUNCTION public.cambiar_categoria_usuario(
  p_user_id uuid,
  p_categoria text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_categorias uc
    WHERE uc.user_id = (SELECT auth.uid()) AND uc.categoria = 'dueno'
  ) THEN
    RAISE EXCEPTION 'Sin permiso para cambiar categorias' USING errcode = '42501';
  END IF;

  IF p_categoria NOT IN ('superamigos', 'amigos', 'publico') THEN
    RAISE EXCEPTION 'Categoria invalida' USING errcode = '22023';
  END IF;

  UPDATE public.usuarios_categorias uc
  SET categoria = p_categoria, asignado_at = now()
  WHERE uc.user_id = p_user_id AND uc.categoria <> 'dueno';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado o protegido' USING errcode = '22023';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.listar_usuarios_admin();

CREATE FUNCTION public.listar_usuarios_admin()
RETURNS TABLE(user_id uuid, email text, nombre text, avatar_url text, categoria text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_categorias uc
    WHERE uc.user_id = (SELECT auth.uid()) AND uc.categoria = 'dueno'
  ) THEN
    RAISE EXCEPTION 'Sin permiso para ver usuarios' USING errcode = '42501';
  END IF;

  RETURN QUERY
    SELECT
      uc.user_id,
      au.email::text,
      NULLIF(pg_catalog.btrim(au.raw_user_meta_data ->> 'nombre'), '')::text,
      NULLIF(pg_catalog.btrim(au.raw_user_meta_data ->> 'avatar_url'), '')::text,
      uc.categoria
    FROM public.usuarios_categorias uc
    JOIN auth.users au ON au.id = uc.user_id
    ORDER BY CASE uc.categoria
      WHEN 'dueno' THEN 0
      WHEN 'superamigos' THEN 1
      WHEN 'amigos' THEN 2
      ELSE 3
    END, lower(au.email);
END;
$$;

REVOKE ALL ON FUNCTION public.listar_usuarios_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cambiar_categoria_usuario(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_categoria_usuario(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_cancion_cancionero(p_cancion_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_categoria text;
  v_en timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión.';
  END IF;

  SELECT uc.categoria INTO v_categoria
  FROM public.usuarios_categorias uc
  WHERE uc.user_id = v_uid;

  IF v_categoria IS DISTINCT FROM 'dueno'
     AND v_categoria IS DISTINCT FROM 'superamigos'
     AND v_categoria IS DISTINCT FROM 'amigos' THEN
    RAISE EXCEPTION 'No podés validar canciones.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.canciones_guardadas c
    WHERE c.id = p_cancion_id
      AND c.sala_id IS NULL
      AND c.validada_por IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Esta canción ya está validada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.canciones_guardadas c
    WHERE c.id = p_cancion_id
      AND c.sala_id IS NULL
  ) THEN
    RAISE EXCEPTION 'No encontramos esa canción.';
  END IF;

  v_en := pg_catalog.now();
  PERFORM pg_catalog.set_config('app.validacion_cancionero', '1', true);

  UPDATE public.canciones_guardadas AS c
  SET validada_por = v_uid,
      validada_en = v_en
  WHERE c.id = p_cancion_id
    AND c.sala_id IS NULL;

  RETURN pg_catalog.jsonb_build_object(
    'validada_por', v_uid,
    'validada_en', v_en
  );
END;
$$;
