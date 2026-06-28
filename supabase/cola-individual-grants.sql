-- Privileges for cola_individual (PostgREST requires GRANTs in addition to RLS).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cola_individual TO authenticated;
