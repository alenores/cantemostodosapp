-- Paso 0 (offline cancionero): columna updated_at para detectar cambios al sincronizar.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Filas existentes: alinear con created_at (ADD COLUMN DEFAULT now() les pone la fecha de migración).
UPDATE public.canciones_guardadas
SET updated_at = created_at;

CREATE OR REPLACE FUNCTION public.set_canciones_guardadas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canciones_guardadas_updated_at ON public.canciones_guardadas;

CREATE TRIGGER trg_canciones_guardadas_updated_at
  BEFORE UPDATE ON public.canciones_guardadas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_canciones_guardadas_updated_at();
