-- Cancionero personal: canciones sin sala (sala_id null) con letra manual.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE canciones_guardadas ALTER COLUMN sala_id DROP NOT NULL;
ALTER TABLE canciones_guardadas ADD COLUMN IF NOT EXISTS letra text null;

-- Cola: texto manual para canciones del cancionero (ya usado en la app como letra_texto).
ALTER TABLE cola_juntada ADD COLUMN IF NOT EXISTS letra_texto text null;

-- Permisos y RLS para editar canciones del cancionero.
GRANT UPDATE ON public.canciones_guardadas TO authenticated;

DROP POLICY IF EXISTS "auth modifica guardadas" ON canciones_guardadas;
CREATE POLICY "auth modifica guardadas"
  ON canciones_guardadas
  FOR UPDATE
  TO authenticated
  USING (true);
