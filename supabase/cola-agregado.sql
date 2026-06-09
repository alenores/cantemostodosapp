-- Snapshot de quién agregó cada ítem a la cola.
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE cola_juntada ADD COLUMN IF NOT EXISTS agregado_por uuid null;
ALTER TABLE cola_juntada ADD COLUMN IF NOT EXISTS agregado_nombre text null;
ALTER TABLE cola_juntada ADD COLUMN IF NOT EXISTS agregado_avatar_url text null;
