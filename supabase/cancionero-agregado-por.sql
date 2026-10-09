-- Firma visible en las tarjetas del Cancionero. Solo se publican nombre y avatar.
ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS agregado_nombre text,
  ADD COLUMN IF NOT EXISTS agregado_avatar_url text;

-- Recuperar la firma de las canciones ya publicadas.
UPDATE public.canciones_guardadas AS c
SET agregado_nombre = COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'nombre'), ''), 'Usuario'),
    agregado_avatar_url = NULLIF(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
FROM auth.users AS u
WHERE c.user_id = u.id
  AND c.sala_id IS NULL
  AND (c.agregado_nombre IS NULL OR c.agregado_avatar_url IS NULL);

-- Completar la firma al guardar canciones nuevas desde cualquier pantalla.
CREATE OR REPLACE FUNCTION public.completar_autor_cancionero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.sala_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(trim(u.raw_user_meta_data ->> 'nombre'), ''), 'Usuario'),
           NULLIF(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
      INTO NEW.agregado_nombre, NEW.agregado_avatar_url
    FROM auth.users AS u
    WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.completar_autor_cancionero() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_completar_autor_cancionero ON public.canciones_guardadas;
CREATE TRIGGER trg_completar_autor_cancionero
  BEFORE INSERT ON public.canciones_guardadas
  FOR EACH ROW
  EXECUTE FUNCTION public.completar_autor_cancionero();
