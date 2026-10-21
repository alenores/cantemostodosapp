-- Nombre y foto de cada usuario, en un solo lugar.
-- Las canciones y la fila de la juntada guardan solo QUIÉN (user_id, validada_por, agregado_por)
-- y miran acá el nombre y la foto. Cambiar la foto no toca ninguna canción, así el Cancionero
-- descargado en el celular no se vuelve a bajar entero.
-- La fuente sigue siendo el perfil de la cuenta (auth.users.raw_user_meta_data): esta tabla se
-- llena sola desde ahí y nadie la escribe a mano.

CREATE TABLE IF NOT EXISTS public.perfiles_publicos (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Usuario',
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfiles_publicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura perfiles publicos" ON public.perfiles_publicos;
CREATE POLICY "lectura perfiles publicos"
  ON public.perfiles_publicos
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.perfiles_publicos FROM anon, authenticated;
GRANT SELECT ON public.perfiles_publicos TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sincronizar_perfil_publico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_nombre text := coalesce(nullif(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'nombre'), ''), 'Usuario');
  v_avatar text := nullif(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'avatar_url'), '');
BEGIN
  INSERT INTO public.perfiles_publicos AS p (id, nombre, avatar_url, updated_at)
  VALUES (NEW.id, v_nombre, v_avatar, pg_catalog.now())
  ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = EXCLUDED.updated_at
    -- Solo cuando cambió de verdad: iniciar sesión también toca la cuenta.
    WHERE p.nombre IS DISTINCT FROM EXCLUDED.nombre
       OR p.avatar_url IS DISTINCT FROM EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_perfil_publico() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sincronizar_perfil_publico ON auth.users;
CREATE TRIGGER sincronizar_perfil_publico
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sincronizar_perfil_publico();

-- Usuarios que ya existían.
INSERT INTO public.perfiles_publicos (id, nombre, avatar_url)
SELECT u.id,
       coalesce(nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'nombre'), ''), 'Usuario'),
       nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'avatar_url'), '')
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

-- Claves foráneas: quién validó y quién sumó a la fila apuntan al perfil.
-- (canciones_guardadas.user_id ya apunta a auth.users, que es el mismo usuario.)
ALTER TABLE public.canciones_guardadas
  DROP CONSTRAINT IF EXISTS canciones_guardadas_validada_por_fkey;
ALTER TABLE public.canciones_guardadas
  ADD CONSTRAINT canciones_guardadas_validada_por_fkey
  FOREIGN KEY (validada_por) REFERENCES public.perfiles_publicos (id) ON DELETE SET NULL;

ALTER TABLE public.cola_juntada
  DROP CONSTRAINT IF EXISTS cola_juntada_agregado_por_fkey;
ALTER TABLE public.cola_juntada
  ADD CONSTRAINT cola_juntada_agregado_por_fkey
  FOREIGN KEY (agregado_por) REFERENCES public.perfiles_publicos (id) ON DELETE SET NULL;

-- Al borrar una cuenta, la clave foránea vacía validada_por desde adentro de otro disparador:
-- la protección del tilde tiene que dejarla pasar o el borrado falla.
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
    NEW.validada_nombre := OLD.validada_nombre;
    NEW.validada_avatar_url := OLD.validada_avatar_url;
  END IF;
  RETURN NEW;
END;
$$;

-- Canción sumada por el modo aleatorio: antes se marcaba escribiendo «aleatorio://» en la foto.
ALTER TABLE public.cola_juntada
  ADD COLUMN IF NOT EXISTS agregado_aleatorio boolean NOT NULL DEFAULT false;

UPDATE public.cola_juntada
SET agregado_aleatorio = true
WHERE agregado_avatar_url = 'aleatorio://'
  AND agregado_aleatorio = false;
