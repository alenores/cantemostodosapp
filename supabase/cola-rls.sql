-- Políticas RLS para cola_juntada (necesarias para sumar canciones desde el buscador).
-- Ejecutar en Supabase → SQL Editor si aparece "new row violates row-level security".

ALTER TABLE public.cola_juntada ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth lee cola" ON public.cola_juntada;
CREATE POLICY "auth lee cola"
  ON public.cola_juntada
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth escribe cola" ON public.cola_juntada;
CREATE POLICY "auth escribe cola"
  ON public.cola_juntada
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth modifica cola" ON public.cola_juntada;
CREATE POLICY "auth modifica cola"
  ON public.cola_juntada
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth borra cola" ON public.cola_juntada;
CREATE POLICY "auth borra cola"
  ON public.cola_juntada
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_juntada TO authenticated;
