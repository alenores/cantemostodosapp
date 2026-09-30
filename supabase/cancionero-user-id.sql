-- Propietario de canciones del cancionero global (sala_id IS NULL).
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_canciones_guardadas_user_id
  ON public.canciones_guardadas (user_id)
  WHERE sala_id IS NULL;

-- Los permisos se configuran en cancionero-propietario-solo.sql.
