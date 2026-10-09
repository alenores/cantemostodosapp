-- Las salas son privadas: solo las ve quien es miembro.
-- Cualquier integrante puede sumar a otra persona (el creador suma a la primera).
-- Ejecutar en Supabase → SQL Editor DESPUÉS de sala-miembros.sql

CREATE OR REPLACE FUNCTION public.buscar_personas_para_sala(
  p_sala_id bigint,
  p_nombre text
)
RETURNS TABLE (
  user_id uuid,
  nombre text,
  avatar_url text,
  ya_esta boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_q text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  IF NOT public.es_miembro_sala(p_sala_id) THEN
    RAISE EXCEPTION 'Tenés que estar en la sala para sumar a alguien';
  END IF;

  v_norm := translate(
    lower(trim(COALESCE(p_nombre, ''))),
    'áéíóúüñ',
    'aeiouun'
  );

  IF char_length(v_norm) < 2 THEN
    RETURN;
  END IF;

  v_q := replace(replace(replace(v_norm, '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT
    u.id,
    trim(u.raw_user_meta_data ->> 'nombre')::text,
    NULLIF(trim(u.raw_user_meta_data ->> 'avatar_url'), '')::text,
    EXISTS (
      SELECT 1
      FROM public.sala_miembros sm
      WHERE sm.sala_id = p_sala_id
        AND sm.user_id = u.id
    )
  FROM auth.users u
  WHERE char_length(trim(COALESCE(u.raw_user_meta_data ->> 'nombre', ''))) > 0
    AND translate(
      lower(trim(u.raw_user_meta_data ->> 'nombre')),
      'áéíóúüñ',
      'aeiouun'
    ) LIKE '%' || v_q || '%' ESCAPE '\'
  ORDER BY
    CASE
      WHEN translate(
        lower(trim(u.raw_user_meta_data ->> 'nombre')),
        'áéíóúüñ',
        'aeiouun'
      ) = v_norm THEN 0
      WHEN translate(
        lower(trim(u.raw_user_meta_data ->> 'nombre')),
        'áéíóúüñ',
        'aeiouun'
      ) LIKE v_q || '%' ESCAPE '\' THEN 1
      ELSE 2
    END,
    trim(u.raw_user_meta_data ->> 'nombre')
  LIMIT 6;
END;
$$;

CREATE OR REPLACE FUNCTION public.agregar_persona_a_sala(
  p_sala_id bigint,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debés iniciar sesión';
  END IF;

  IF NOT public.es_miembro_sala(p_sala_id) THEN
    RAISE EXCEPTION 'Tenés que estar en la sala para sumar a alguien';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Elegí a alguien';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'No encontramos a esa persona';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sala_miembros sm
    WHERE sm.sala_id = p_sala_id
      AND sm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Ya está en la sala';
  END IF;

  INSERT INTO public.sala_miembros (sala_id, user_id, rol)
  VALUES (p_sala_id, p_user_id, 'member');
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_personas_para_sala(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agregar_persona_a_sala(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_personas_para_sala(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agregar_persona_a_sala(bigint, uuid) TO authenticated;

-- Nadie ve una sala en la que no está.
DROP POLICY IF EXISTS "auth lee salas" ON public.salas;
DROP POLICY IF EXISTS "miembros leen salas" ON public.salas;

CREATE POLICY "miembros leen salas"
  ON public.salas
  FOR SELECT
  TO authenticated
  USING (public.es_miembro_sala(id));
