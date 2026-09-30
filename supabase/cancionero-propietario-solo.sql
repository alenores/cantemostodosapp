-- Ejecutar en el proyecto Supabase de Cantemos Todos.
-- El Cancionero global se puede leer entre todos; solo el autor puede cambiar o borrar su canción.
-- Las canciones de sala conservan los permisos de sus miembros.

ALTER TABLE public.canciones_guardadas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canciones_guardadas TO authenticated;
GRANT SELECT ON public.canciones_guardadas TO anon;

-- Las políticas permisivas se combinan entre sí. Quitar todas las de escritura
-- evita que alguna política antigua deje editar canciones ajenas.
DO $$
DECLARE
  politica record;
BEGIN
  FOR politica IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'canciones_guardadas'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.canciones_guardadas', politica.policyname);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "auth lee guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth lee guardadas"
  ON public.canciones_guardadas
  FOR SELECT TO authenticated
  USING (sala_id IS NULL OR public.es_miembro_sala(sala_id));

DROP POLICY IF EXISTS "lectura publica cancionero" ON public.canciones_guardadas;
CREATE POLICY "lectura publica cancionero"
  ON public.canciones_guardadas
  FOR SELECT TO anon
  USING (sala_id IS NULL);

CREATE POLICY "auth inserta guardadas"
  ON public.canciones_guardadas
  FOR INSERT TO authenticated
  WITH CHECK (
    (sala_id IS NULL AND user_id = (SELECT auth.uid()))
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE TO authenticated
  USING (
    (sala_id IS NULL AND user_id = (SELECT auth.uid()))
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  )
  WITH CHECK (
    (sala_id IS NULL AND user_id = (SELECT auth.uid()))
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

CREATE POLICY "auth elimina guardadas"
  ON public.canciones_guardadas
  FOR DELETE TO authenticated
  USING (
    (sala_id IS NULL AND user_id = (SELECT auth.uid()))
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );
