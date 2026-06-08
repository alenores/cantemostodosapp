-- Privileges required for PostgREST / Supabase client access.
-- RLS policies alone are not enough; roles need table-level GRANTs.

GRANT SELECT ON public.salas TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.canciones_guardadas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_juntada TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sesion_sala TO authenticated;

-- RLS policy required for INSERT (run in Supabase SQL Editor if missing):
-- create policy "auth escribe sesion" on sesion_sala for insert to authenticated with check (true);
