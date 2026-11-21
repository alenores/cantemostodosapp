-- Permisos del Cancionero global (sala_id IS NULL) según la categoría de la cuenta.
-- Reemplaza las políticas de escritura de cancionero-propietario-solo.sql.
--
--   dueno        → suma canciones; edita y elimina cualquiera.
--   superamigos  → suma canciones; edita cualquiera; elimina solo las que subió.
--   amigos       → suma canciones; edita y elimina solo las que subió.
--   publico      → no suma, no edita ni elimina.
--
-- Las canciones de sala conservan los permisos de sus miembros.
-- El Entrenador de canciones (canciones_practica) es privado de cada cuenta y no cambia.

CREATE OR REPLACE FUNCTION public.categoria_usuario_actual()
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT uc.categoria
  FROM public.usuarios_categorias uc
  WHERE uc.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.categoria_usuario_actual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.categoria_usuario_actual() TO authenticated;

DROP POLICY IF EXISTS "auth inserta guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth inserta guardadas"
  ON public.canciones_guardadas
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      sala_id IS NULL
      AND user_id = (SELECT auth.uid())
      AND (SELECT public.categoria_usuario_actual()) IN ('dueno', 'superamigos', 'amigos')
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

DROP POLICY IF EXISTS "auth modifica guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth modifica guardadas"
  ON public.canciones_guardadas
  FOR UPDATE TO authenticated
  USING (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (SELECT public.categoria_usuario_actual()) = 'superamigos'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) = 'amigos'
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  )
  WITH CHECK (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (SELECT public.categoria_usuario_actual()) = 'superamigos'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) = 'amigos'
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

DROP POLICY IF EXISTS "auth elimina guardadas" ON public.canciones_guardadas;
CREATE POLICY "auth elimina guardadas"
  ON public.canciones_guardadas
  FOR DELETE TO authenticated
  USING (
    (
      sala_id IS NULL
      AND (
        (SELECT public.categoria_usuario_actual()) = 'dueno'
        OR (
          user_id = (SELECT auth.uid())
          AND (SELECT public.categoria_usuario_actual()) IN ('superamigos', 'amigos')
        )
      )
    )
    OR (sala_id IS NOT NULL AND public.es_miembro_sala(sala_id))
  );

-- Sin esto, un superamigo podría cambiar el dueño de una canción ajena y después borrarla.
CREATE OR REPLACE FUNCTION public.proteger_dueno_cancion_guardada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     AND (SELECT public.categoria_usuario_actual()) IS DISTINCT FROM 'dueno' THEN
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_dueno_cancion_guardada() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proteger_dueno_cancion_guardada ON public.canciones_guardadas;
CREATE TRIGGER trg_proteger_dueno_cancion_guardada
  BEFORE UPDATE ON public.canciones_guardadas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_dueno_cancion_guardada();
