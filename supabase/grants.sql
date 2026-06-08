-- Privileges required for PostgREST / Supabase client access.
-- RLS policies alone are not enough; roles need table-level GRANTs.

GRANT SELECT ON public.salas TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.canciones_guardadas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_juntada TO authenticated;
GRANT SELECT, UPDATE ON public.sesion_sala TO authenticated;
