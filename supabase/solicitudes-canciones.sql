-- Solicitudes de canciones (2026-11-26).
-- Cualquier persona con cuenta pide una canción (nombre + artista). Un agente de IA la carga al
-- Cancionero a nombre de quien la pidió. Todos (también sin cuenta) ven la lista.
--
-- Estados:
--   pendiente    → esperando al agente.
--   cargada      → el agente la cargó; cancion_id apunta a la canción (agregada por quien la pidió).
--   ya_existia   → ya estaba en el Cancionero (la cargó otra persona); cancion_id apunta a esa.
--   en_revision  → el agente no pudo; la revisa el dueño.
--   no_se_pudo   → el dueño decidió que no se puede cargar.
--
-- Nadie escribe la tabla directo: se usan las funciones de abajo. El agente trabaja con SQL de
-- servicio (ver docs/agente-solicitudes.md).

CREATE OR REPLACE FUNCTION public.normalizar_texto_solicitud(p text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT pg_catalog.regexp_replace(
    pg_catalog.translate(
      pg_catalog.replace(pg_catalog.lower(coalesce(p, '')), '&', 'y'),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '[^a-z0-9]+', '', 'g'
  );
$$;

GRANT EXECUTE ON FUNCTION public.normalizar_texto_solicitud(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.solicitudes_canciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.perfiles_publicos (id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (pg_catalog.btrim(nombre) <> ''),
  artista text NOT NULL CHECK (pg_catalog.btrim(artista) <> ''),
  artista_id uuid REFERENCES public.artistas (id) ON DELETE SET NULL,
  nombre_norm text GENERATED ALWAYS AS (public.normalizar_texto_solicitud(nombre)) STORED,
  artista_norm text GENERATED ALWAYS AS (public.normalizar_texto_solicitud(artista)) STORED,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'cargada', 'ya_existia', 'en_revision', 'no_se_pudo')),
  cancion_id bigint REFERENCES public.canciones_guardadas (id) ON DELETE SET NULL,
  aviso_visto boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  procesada_en timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_canciones_unica
  ON public.solicitudes_canciones (nombre_norm, artista_norm);
CREATE INDEX IF NOT EXISTS solicitudes_canciones_estado
  ON public.solicitudes_canciones (estado, created_at);
CREATE INDEX IF NOT EXISTS solicitudes_canciones_user
  ON public.solicitudes_canciones (user_id);

ALTER TABLE public.solicitudes_canciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitudes_canciones FROM anon, authenticated;
GRANT SELECT ON public.solicitudes_canciones TO anon, authenticated;

DROP POLICY IF EXISTS "lectura solicitudes" ON public.solicitudes_canciones;
CREATE POLICY "lectura solicitudes"
  ON public.solicitudes_canciones
  FOR SELECT TO anon, authenticated
  USING (true);

-- ¿Ya existe? Devuelve la canción del Cancionero o la solicitud que coincide.
CREATE OR REPLACE FUNCTION public.buscar_duplicado_solicitud(
  p_nombre text,
  p_artista text,
  p_artista_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_nombre text := public.normalizar_texto_solicitud(p_nombre);
  v_artista text := public.normalizar_texto_solicitud(p_artista);
  v_cancion record;
  v_solicitud record;
BEGIN
  SELECT c.id, c.nombre, c.artista
    INTO v_cancion
  FROM public.canciones_guardadas c
  LEFT JOIN public.artistas a ON a.id = c.artista_id
  WHERE c.sala_id IS NULL
    AND public.normalizar_texto_solicitud(c.nombre) = v_nombre
    AND (
      public.normalizar_texto_solicitud(c.artista) = v_artista
      OR public.normalizar_texto_solicitud(a.nombre) = v_artista
      OR (p_artista_id IS NOT NULL AND c.artista_id = p_artista_id)
      OR EXISTS (
        SELECT 1 FROM public.artistas_alias al
        WHERE al.artista_id = c.artista_id
          AND public.normalizar_texto_solicitud(al.alias) = v_artista
      )
    )
  ORDER BY c.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'tipo', 'cancionero', 'id', v_cancion.id,
      'nombre', v_cancion.nombre, 'artista', v_cancion.artista
    );
  END IF;

  SELECT s.id, s.nombre, s.artista, s.estado
    INTO v_solicitud
  FROM public.solicitudes_canciones s
  WHERE s.nombre_norm = v_nombre
    AND (s.artista_norm = v_artista OR (p_artista_id IS NOT NULL AND s.artista_id = p_artista_id))
  ORDER BY s.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'tipo', 'solicitud', 'id', v_solicitud.id,
      'nombre', v_solicitud.nombre, 'artista', v_solicitud.artista,
      'estado', v_solicitud.estado
    );
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_duplicado_solicitud(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_duplicado_solicitud(text, text, uuid) TO anon, authenticated;

-- Pedir una canción. Solo con cuenta. Si ya existe, no la suma y devuelve cuál encontró.
CREATE OR REPLACE FUNCTION public.solicitar_cancion(
  p_nombre text,
  p_artista text,
  p_artista_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nombre text := pg_catalog.btrim(coalesce(p_nombre, ''));
  v_artista text := pg_catalog.btrim(coalesce(p_artista, ''));
  v_dup jsonb;
  v_id bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Para pedir canciones hay que iniciar sesión.';
  END IF;
  IF v_nombre = '' OR v_artista = '' THEN
    RAISE EXCEPTION 'Faltan la canción o el artista.';
  END IF;

  v_dup := public.buscar_duplicado_solicitud(v_nombre, v_artista, p_artista_id);
  IF v_dup IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'duplicado', v_dup);
  END IF;

  INSERT INTO public.solicitudes_canciones (user_id, nombre, artista, artista_id)
  VALUES (v_uid, v_nombre, v_artista, p_artista_id)
  ON CONFLICT (nombre_norm, artista_norm) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'duplicado', public.buscar_duplicado_solicitud(v_nombre, v_artista, p_artista_id)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_cancion(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solicitar_cancion(text, text, uuid) TO authenticated;

-- Quien pidió ya vio el aviso de sus solicitudes procesadas (apaga la campanita).
CREATE OR REPLACE FUNCTION public.marcar_solicitudes_vistas()
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.solicitudes_canciones
  SET aviso_visto = true
  WHERE user_id = auth.uid()
    AND aviso_visto = false
    AND estado IN ('cargada', 'ya_existia', 'no_se_pudo');
$$;

REVOKE ALL ON FUNCTION public.marcar_solicitudes_vistas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_solicitudes_vistas() TO authenticated;

-- Dueño: resolver una solicitud en revisión.
--   p_cancion_id con valor → vincula esa canción; queda «cargada» y a nombre de quien la pidió.
--   p_cancion_id NULL      → «no se pudo».
CREATE OR REPLACE FUNCTION public.resolver_solicitud(p_id bigint, p_cancion_id bigint DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF (SELECT public.categoria_usuario_actual()) IS DISTINCT FROM 'dueno' THEN
    RAISE EXCEPTION 'Solo el dueño puede resolver solicitudes.';
  END IF;

  SELECT user_id INTO v_user FROM public.solicitudes_canciones WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe.';
  END IF;

  IF p_cancion_id IS NULL THEN
    UPDATE public.solicitudes_canciones
    SET estado = 'no_se_pudo', cancion_id = NULL, aviso_visto = false, procesada_en = now()
    WHERE id = p_id;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.canciones_guardadas WHERE id = p_cancion_id AND sala_id IS NULL
  ) THEN
    RAISE EXCEPTION 'La canción no está en el Cancionero.';
  END IF;

  UPDATE public.canciones_guardadas SET user_id = v_user WHERE id = p_cancion_id;

  UPDATE public.solicitudes_canciones
  SET estado = 'cargada', cancion_id = p_cancion_id, aviso_visto = false, procesada_en = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolver_solicitud(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_solicitud(bigint, bigint) TO authenticated;
