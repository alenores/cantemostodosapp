-- Modo tonal de referencia al guardar canciones con cifrado avanzado.
-- Ejecutar en Supabase → SQL Editor (después de cifrado-avanzado.sql).

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS modo_tonal_default text NOT NULL DEFAULT 'mayor'
  CHECK (modo_tonal_default IN ('mayor', 'menor'));
