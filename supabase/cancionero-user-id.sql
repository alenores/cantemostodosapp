-- Propietario de canciones del cancionero global (sala_id IS NULL).
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_canciones_guardadas_user_id
  ON public.canciones_guardadas (user_id)
  WHERE sala_id IS NULL;

DROP POLICY IF EXISTS "auth inserta guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth inserta guardadas"
  ON public.canciones_guardadas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sala_id IS NOT NULL
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "auth modifica guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE
  TO authenticated
  USING (
    sala_id IS NOT NULL
    OR auth.uid() = user_id
  )
  WITH CHECK (
    sala_id IS NOT NULL
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "auth elimina guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth elimina guardadas"
  ON public.canciones_guardadas
  FOR DELETE
  TO authenticated
  USING (
    sala_id IS NOT NULL
    OR auth.uid() = user_id
  );
