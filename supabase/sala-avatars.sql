-- Foto de perfil de sala (Storage + columna avatar_url).
-- Ejecutar en Supabase → SQL Editor DESPUÉS de sala-miembros.sql
-- (usa public.es_owner_sala).

-- 1) Columna en salas
ALTER TABLE public.salas
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('sala-avatars', 'sala-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Policies Storage
DROP POLICY IF EXISTS "sala-avatars public read" ON storage.objects;
CREATE POLICY "sala-avatars public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sala-avatars');

DROP POLICY IF EXISTS "sala-avatars owner upload" ON storage.objects;
CREATE POLICY "sala-avatars owner upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sala-avatars'
    AND public.es_owner_sala(((storage.foldername(name))[1])::bigint)
  );

DROP POLICY IF EXISTS "sala-avatars owner update" ON storage.objects;
CREATE POLICY "sala-avatars owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sala-avatars'
    AND public.es_owner_sala(((storage.foldername(name))[1])::bigint)
  )
  WITH CHECK (
    bucket_id = 'sala-avatars'
    AND public.es_owner_sala(((storage.foldername(name))[1])::bigint)
  );

DROP POLICY IF EXISTS "sala-avatars owner delete" ON storage.objects;
CREATE POLICY "sala-avatars owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sala-avatars'
    AND public.es_owner_sala(((storage.foldername(name))[1])::bigint)
  );
