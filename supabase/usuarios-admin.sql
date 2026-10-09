-- Administración de categorías para la cuenta dueña.
-- Aplicada al proyecto Supabase de Cantemos Todos el 30/09/2026.

DROP FUNCTION IF EXISTS public.listar_usuarios_admin();

CREATE FUNCTION public.listar_usuarios_admin()
RETURNS TABLE(user_id uuid, email text, nombre text, avatar_url text, categoria text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_categorias uc
    WHERE uc.user_id = (SELECT auth.uid()) AND uc.categoria = 'dueno'
  ) THEN
    RAISE EXCEPTION 'Sin permiso para ver usuarios' USING errcode = '42501';
  END IF;

  RETURN QUERY
    SELECT
      uc.user_id,
      au.email::text,
      NULLIF(pg_catalog.btrim(au.raw_user_meta_data ->> 'nombre'), '')::text,
      NULLIF(pg_catalog.btrim(au.raw_user_meta_data ->> 'avatar_url'), '')::text,
      uc.categoria
    FROM public.usuarios_categorias uc
    JOIN auth.users au ON au.id = uc.user_id
    ORDER BY CASE uc.categoria
      WHEN 'dueno' THEN 0
      WHEN 'amigos' THEN 1
      ELSE 2
    END, lower(au.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.cambiar_categoria_usuario(
  p_user_id uuid,
  p_categoria text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_categorias uc
    WHERE uc.user_id = (SELECT auth.uid()) AND uc.categoria = 'dueno'
  ) THEN
    RAISE EXCEPTION 'Sin permiso para cambiar categorias' USING errcode = '42501';
  END IF;

  IF p_categoria NOT IN ('amigos', 'publico') THEN
    RAISE EXCEPTION 'Categoria invalida' USING errcode = '22023';
  END IF;

  UPDATE public.usuarios_categorias uc
  SET categoria = p_categoria, asignado_at = now()
  WHERE uc.user_id = p_user_id AND uc.categoria <> 'dueno';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado o protegido' USING errcode = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_usuarios_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cambiar_categoria_usuario(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_categoria_usuario(uuid, text) TO authenticated;
