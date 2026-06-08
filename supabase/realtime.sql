-- Habilitar Realtime en las tablas de la sala.
-- Ejecutar en Supabase SQL Editor si los cambios no se propagan entre dispositivos.

alter publication supabase_realtime add table public.cola_juntada;
alter publication supabase_realtime add table public.sesion_sala;
alter publication supabase_realtime add table public.canciones_guardadas;
