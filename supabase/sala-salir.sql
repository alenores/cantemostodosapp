-- Salir de una sala (solo miembros, no el creador).
-- Ejecutar en Supabase → SQL Editor DESPUÉS de sala-miembros.sql

CREATE OR REPLACE FUNCTION public.salir_de_sala(p_sala_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rol text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  SELECT sm.rol INTO v_rol
  FROM public.sala_miembros sm
  WHERE sm.sala_id = p_sala_id AND sm.user_id = v_uid;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'No pertenecés a esta sala';
  END IF;

  IF v_rol = 'owner' THEN
    RAISE EXCEPTION 'El creador no puede salir de la sala';
  END IF;

  DELETE FROM public.sala_miembros
  WHERE sala_id = p_sala_id
    AND user_id = v_uid
    AND rol = 'member';
END;
$$;

REVOKE ALL ON FUNCTION public.salir_de_sala(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salir_de_sala(bigint) TO authenticated;

-- Defensa en profundidad: un miembro puede borrarse a sí mismo (no al owner)
DROP POLICY IF EXISTS "miembro sale de sala" ON public.sala_miembros;
CREATE POLICY "miembro sale de sala"
  ON public.sala_miembros
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND rol = 'member'
  );
