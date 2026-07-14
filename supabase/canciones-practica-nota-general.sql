-- Nota general (texto libre por canción) del Entrenador de canciones.
-- Ejecutar en Supabase → SQL Editor (idempotente, para bases ya creadas).

ALTER TABLE public.canciones_practica
  ADD COLUMN IF NOT EXISTS nota_general text;
