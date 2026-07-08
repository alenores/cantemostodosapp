-- Editor de cifrado avanzado: columnas JSON para acordes posicionados y compás.
-- Ejecutar en Supabase SQL Editor.
--
-- tonalidad_default / modo_tonal_default / bpm_default: preferencias al guardar (tono, modo y tempo de referencia).
-- compas_config: solo si la canción tiene compases marcados (tipo 4/4|3/4|6/8 + posiciones).
--   El tipo de compás define cuántos golpes hay por compás; no hace falta otra columna.

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS cifrado jsonb,
  ADD COLUMN IF NOT EXISTS compas_config jsonb,
  ADD COLUMN IF NOT EXISTS tiene_cifrado_avanzado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tonalidad_default smallint,
  ADD COLUMN IF NOT EXISTS modo_tonal_default text NOT NULL DEFAULT 'mayor'
    CHECK (modo_tonal_default IN ('mayor', 'menor')),
  ADD COLUMN IF NOT EXISTS bpm_default smallint;

ALTER TABLE public.canciones_guardadas
  ALTER COLUMN url_letra DROP NOT NULL;

-- Permisos RLS para editar canciones del cancionero (requerido para Guardar en el editor).
-- Sin la política UPDATE, Postgres devuelve 0 filas actualizadas sin error.
GRANT SELECT, UPDATE ON public.canciones_guardadas TO authenticated;

DROP POLICY IF EXISTS "auth lee guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth lee guardadas"
  ON public.canciones_guardadas
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth modifica guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
