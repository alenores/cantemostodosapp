-- Privileges required for PostgREST / Supabase client access.
-- RLS policies alone are not enough; roles need table-level GRANTs.

GRANT SELECT, INSERT ON public.salas TO authenticated;

-- RLS policy required for INSERT (run in Supabase SQL Editor if missing):
-- create policy "auth escribe salas" on salas for insert to authenticated with check (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canciones_guardadas TO authenticated;
GRANT SELECT ON public.canciones_guardadas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_juntada TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_individual TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sesion_sala TO authenticated;

-- RLS policy required for INSERT (run in Supabase SQL Editor if missing):
-- create policy "auth escribe sesion" on sesion_sala for insert to authenticated with check (true);
