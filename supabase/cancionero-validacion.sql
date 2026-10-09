-- Tilde azul del Cancionero.
-- Dueño y amigos lo ponen. Solo quien lo puso, y el dueño, pueden quitarlo.
-- Una edición común de la canción no puede cambiar estos datos.

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS validada_por uuid,
  ADD COLUMN IF NOT EXISTS validada_en timestamptz,
  ADD COLUMN IF NOT EXISTS validada_nombre text,
  ADD COLUMN IF NOT EXISTS validada_avatar_url text;

CREATE OR REPLACE FUNCTION public.proteger_validacion_cancionero()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF coalesce(pg_catalog.current_setting('app.validacion_cancionero', true), '') <> '1' THEN
    NEW.validada_por := OLD.validada_por;
    NEW.validada_en := OLD.validada_en;
    NEW.validada_nombre := OLD.validada_nombre;
    NEW.validada_avatar_url := OLD.validada_avatar_url;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_validacion_cancionero() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_validacion_cancionero ON public.canciones_guardadas;
CREATE TRIGGER trg_proteger_validacion_cancionero
  BEFORE UPDATE ON public.canciones_guardadas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_validacion_cancionero();

CREATE OR REPLACE FUNCTION public.validar_cancion_cancionero(p_cancion_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_categoria text;
  v_nombre text;
  v_avatar text;
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

  SELECT coalesce(nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'nombre'), ''), 'Usuario'),
         nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'avatar_url'), '')
    INTO v_nombre, v_avatar
  FROM auth.users AS u
  WHERE u.id = v_uid;

  v_en := pg_catalog.now();
  PERFORM pg_catalog.set_config('app.validacion_cancionero', '1', true);

  UPDATE public.canciones_guardadas AS c
  SET validada_por = v_uid,
      validada_en = v_en,
      validada_nombre = v_nombre,
      validada_avatar_url = v_avatar
  WHERE c.id = p_cancion_id
    AND c.sala_id IS NULL;

  RETURN pg_catalog.jsonb_build_object(
    'validada_por', v_uid,
    'validada_en', v_en,
    'validada_nombre', v_nombre,
    'validada_avatar_url', v_avatar
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
      validada_en = NULL,
      validada_nombre = NULL,
      validada_avatar_url = NULL
  WHERE c.id = p_cancion_id
    AND c.sala_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_cancion_cancionero(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.quitar_validacion_cancion_cancionero(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_cancion_cancionero(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quitar_validacion_cancion_cancionero(bigint) TO authenticated;
