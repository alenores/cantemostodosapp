-- Asignar canciones existentes del cancionero global a un usuario.
-- Ejecutar DESPUÉS de cancionero-user-id.sql en Supabase SQL Editor.
--
-- Solo afecta canciones del cancionero (sala_id IS NULL) que aún no tienen dueño.

UPDATE public.canciones_guardadas
SET user_id = 'fa5ae382-2b22-4812-a486-a00ddc82d994'
WHERE sala_id IS NULL
  AND user_id IS NULL;
