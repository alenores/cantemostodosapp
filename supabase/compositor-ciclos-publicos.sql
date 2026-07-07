-- Ciclos públicos del Compositor (compartidos con la comunidad).
-- Ejecutar en Supabase → SQL Editor después de compositor-ciclos.sql.

ALTER TABLE public.compositor_ciclos
  ADD COLUMN IF NOT EXISTS es_publico boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS compositor_ciclos_public_updated_idx
  ON public.compositor_ciclos (updated_at DESC)
  WHERE es_publico = true;

DROP POLICY IF EXISTS "auth lee compositor ciclos publicos" ON public.compositor_ciclos;
CREATE POLICY "auth lee compositor ciclos publicos"
  ON public.compositor_ciclos
  FOR SELECT
  TO authenticated
  USING (es_publico = true);
