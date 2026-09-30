-- Categorías globales de Cantemos Todos.
-- La cuenta nueva entra como publico. dueno y amigos se asignan desde la administración.
-- Esta clasificación no concede permisos por sí sola.

CREATE TABLE IF NOT EXISTS public.usuarios_categorias (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'publico'
    CHECK (categoria IN ('dueno', 'amigos', 'publico')),
  asignado_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_categorias_un_dueno
  ON public.usuarios_categorias (categoria)
  WHERE categoria = 'dueno';

ALTER TABLE public.usuarios_categorias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios_categorias FROM anon, authenticated;
GRANT SELECT ON public.usuarios_categorias TO authenticated;

DROP POLICY IF EXISTS "usuario lee su categoria" ON public.usuarios_categorias;
CREATE POLICY "usuario lee su categoria"
  ON public.usuarios_categorias
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

INSERT INTO public.usuarios_categorias (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.registrar_categoria_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios_categorias (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.registrar_categoria_usuario()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS registrar_categoria_usuario ON auth.users;
CREATE TRIGGER registrar_categoria_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app_private.registrar_categoria_usuario();
