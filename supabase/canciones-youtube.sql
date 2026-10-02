-- Link de YouTube opcional por canción (Cancionero y copias del Entrenador de canciones).
-- Se guarda el link normalizado (https://www.youtube.com/watch?v=ID). Solo se usa con conexión.
-- Ejecutar en Supabase → SQL Editor (idempotente, para bases ya creadas).

ALTER TABLE public.canciones_guardadas
  ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE public.canciones_practica
  ADD COLUMN IF NOT EXISTS youtube_url text;
