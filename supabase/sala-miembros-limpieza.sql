-- =============================================================================
-- OPCIONAL — limpiar o reclamar salas viejas (después de sala-miembros.sql)
-- =============================================================================
-- Elegí UNA opción. Las salas sin dueño/miembros quedan invisibles para todos.

-- -----------------------------------------------------------------------------
-- Opción A — borrar salas de prueba sin dueño (recomendado)
-- -----------------------------------------------------------------------------
DELETE FROM public.salas
WHERE creado_por IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.sala_miembros sm WHERE sm.sala_id = salas.id
  );

-- -----------------------------------------------------------------------------
-- Opción B — asignarte como dueño de las salas huérfanas
-- 1) Authentication → Users → copiá tu User UID
-- 2) Reemplazá el UUID abajo y ejecutá
-- -----------------------------------------------------------------------------
-- UPDATE public.salas
-- SET creado_por = 'PEGAR-TU-USER-UUID-AQUI'
-- WHERE creado_por IS NULL;
--
-- INSERT INTO public.sala_miembros (sala_id, user_id, rol)
-- SELECT s.id, s.creado_por, 'owner'
-- FROM public.salas s
-- WHERE s.creado_por IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Después de A o B (cuando no queden creado_por null):
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.salas
--   ALTER COLUMN creado_por SET NOT NULL;
