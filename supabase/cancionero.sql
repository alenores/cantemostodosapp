-- Cancionero personal: canciones sin sala (sala_id null) con letra manual.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE canciones_guardadas ALTER COLUMN sala_id DROP NOT NULL;
ALTER TABLE canciones_guardadas ADD COLUMN IF NOT EXISTS letra text null;

-- Cola: texto manual para canciones del cancionero (ya usado en la app como letra_texto).
ALTER TABLE cola_juntada ADD COLUMN IF NOT EXISTS letra_texto text null;

-- Los permisos de lectura y escritura se configuran en cancionero-propietario-solo.sql.
GRANT SELECT, UPDATE ON public.canciones_guardadas TO authenticated;
