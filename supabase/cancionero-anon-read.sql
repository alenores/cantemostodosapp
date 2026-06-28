-- Lectura pública del cancionero global (sala_id IS NULL) para invitados sin sesión.
-- Ejecutar en Supabase SQL Editor.

GRANT SELECT ON public.canciones_guardadas TO anon;

DROP POLICY IF EXISTS "lectura publica cancionero" ON public.canciones_guardadas;
CREATE POLICY "lectura publica cancionero"
  ON public.canciones_guardadas
  FOR SELECT
  TO anon
  USING (sala_id IS NULL);
