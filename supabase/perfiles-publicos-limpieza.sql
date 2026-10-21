-- Segunda parte de perfiles-publicos.sql: se borran las copias de nombre y foto.
-- Correr después de publicar la app que lee `perfiles_publicos`.

DROP TRIGGER IF EXISTS trg_completar_autor_cancionero ON public.canciones_guardadas;
DROP FUNCTION IF EXISTS public.completar_autor_cancionero();

CREATE OR REPLACE FUNCTION public.proteger_validacion_cancionero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF coalesce(pg_catalog.current_setting('app.validacion_cancionero', true), '') <> '1'
     AND pg_catalog.pg_trigger_depth() <= 1 THEN
    NEW.validada_por := OLD.validada_por;
    NEW.validada_en := OLD.validada_en;
  END IF;
  RETURN NEW;
END;
$$;

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

  IF v_categoria IS DISTINCT FROM 'dueno' AND v_categoria IS DISTINCT FROM 'amigos' THEN
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

CREATE OR REPLACE FUNCTION public.quitar_validacion_cancion_cancionero(p_cancion_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_categoria text;
  v_validador uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión.';
  END IF;

  SELECT uc.categoria INTO v_categoria
  FROM public.usuarios_categorias uc
  WHERE uc.user_id = v_uid;

  SELECT c.validada_por INTO v_validador
  FROM public.canciones_guardadas AS c
  WHERE c.id = p_cancion_id
    AND c.sala_id IS NULL;

  IF v_validador IS NULL THEN
    RAISE EXCEPTION 'Esta canción no está validada.';
  END IF;

  IF v_categoria IS DISTINCT FROM 'dueno' AND v_validador IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Solo quien la validó y el dueño pueden quitarla.';
  END IF;

  PERFORM pg_catalog.set_config('app.validacion_cancionero', '1', true);

  UPDATE public.canciones_guardadas AS c
  SET validada_por = NULL,
      validada_en = NULL
  WHERE c.id = p_cancion_id
    AND c.sala_id IS NULL;
END;
$$;

ALTER TABLE public.canciones_guardadas
  DROP COLUMN IF EXISTS agregado_nombre,
  DROP COLUMN IF EXISTS agregado_avatar_url,
  DROP COLUMN IF EXISTS validada_nombre,
  DROP COLUMN IF EXISTS validada_avatar_url;

ALTER TABLE public.cola_juntada
  DROP COLUMN IF EXISTS agregado_nombre,
  DROP COLUMN IF EXISTS agregado_avatar_url;
