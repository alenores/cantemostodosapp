-- Biblioteca de ciclos del Compositor (Fase A).
-- Ejecutar en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.compositor_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(trim(nombre)) >= 1),
  piece jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compositor_ciclos_user_updated_idx
  ON public.compositor_ciclos (user_id, updated_at DESC);

ALTER TABLE public.compositor_ciclos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth lee compositor ciclos" ON public.compositor_ciclos;
CREATE POLICY "auth lee compositor ciclos"
  ON public.compositor_ciclos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth inserta compositor ciclos" ON public.compositor_ciclos;
CREATE POLICY "auth inserta compositor ciclos"
  ON public.compositor_ciclos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth modifica compositor ciclos" ON public.compositor_ciclos;
CREATE POLICY "auth modifica compositor ciclos"
  ON public.compositor_ciclos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth borra compositor ciclos" ON public.compositor_ciclos;
CREATE POLICY "auth borra compositor ciclos"
  ON public.compositor_ciclos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compositor_ciclos TO authenticated;

CREATE OR REPLACE FUNCTION public.set_compositor_ciclos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compositor_ciclos_updated_at ON public.compositor_ciclos;

CREATE TRIGGER trg_compositor_ciclos_updated_at
  BEFORE UPDATE ON public.compositor_ciclos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_compositor_ciclos_updated_at();
