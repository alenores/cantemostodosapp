-- Cualquier integrante puede cambiar la foto y la descripción.
-- El nombre solo lo cambia el dueño.
-- Ejecutar en Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public.proteger_ficha_sala()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_owner_sala(OLD.id) THEN
    NEW.nombre := OLD.nombre;
    NEW.creado_por := OLD.creado_por;
    NEW.invite_token := OLD.invite_token;
    NEW.visible := OLD.visible;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_ficha_sala ON public.salas;
CREATE TRIGGER trg_proteger_ficha_sala
  BEFORE UPDATE ON public.salas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_ficha_sala();

DROP POLICY IF EXISTS "owner actualiza salas" ON public.salas;
DROP POLICY IF EXISTS "miembros actualizan salas" ON public.salas;
CREATE POLICY "miembros actualizan salas"
  ON public.salas
  FOR UPDATE
  TO authenticated
  USING (public.es_miembro_sala(id))
  WITH CHECK (public.es_miembro_sala(id));

DROP POLICY IF EXISTS "sala-avatars owner upload" ON storage.objects;
DROP POLICY IF EXISTS "sala-avatars miembro upload" ON storage.objects;
CREATE POLICY "sala-avatars miembro upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sala-avatars'
    AND public.es_miembro_sala(((storage.foldername(name))[1])::bigint)
  );

DROP POLICY IF EXISTS "sala-avatars owner update" ON storage.objects;
DROP POLICY IF EXISTS "sala-avatars miembro update" ON storage.objects;
CREATE POLICY "sala-avatars miembro update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sala-avatars'
    AND public.es_miembro_sala(((storage.foldername(name))[1])::bigint)
  )
  WITH CHECK (
    bucket_id = 'sala-avatars'
    AND public.es_miembro_sala(((storage.foldername(name))[1])::bigint)
  );

DROP POLICY IF EXISTS "sala-avatars owner delete" ON storage.objects;
DROP POLICY IF EXISTS "sala-avatars miembro delete" ON storage.objects;
CREATE POLICY "sala-avatars miembro delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sala-avatars'
    AND public.es_miembro_sala(((storage.foldername(name))[1])::bigint)
  );
