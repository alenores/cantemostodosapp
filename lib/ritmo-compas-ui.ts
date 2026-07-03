import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { getBeatLevelBarHeightPercent } from "@/lib/metronomo";

/** Escala de altura de barras en el preview del ciclo (config). */
export const RITMO_CYCLE_VOLUME_BAR_SCALE = 0.36;
/** Misma escala +30 % para el gráfico de práctica del slide ritmo. */
export const RITMO_TIMELINE_VOLUME_BAR_SCALE =
  RITMO_CYCLE_VOLUME_BAR_SCALE * 1.3;

export function getRitmoCycleVolumeBarHeightPx(
  level: MetronomeBeatLevel,
  scale = RITMO_CYCLE_VOLUME_BAR_SCALE,
  options?: { uniform?: boolean; showSilence?: boolean },
): number {
  if (level === "silencio" && !options?.showSilence) {
    return 0;
  }

  const heightPercent = options?.uniform
    ? 68
    : Math.max(getBeatLevelBarHeightPercent(level), level === "silencio" ? 0 : 8);
  const minPx = options?.uniform
    ? 14
    : level === "silencio"
      ? options?.showSilence
        ? 6
        : 0
      : 14;

  if (heightPercent === 0 && !options?.showSilence) {
    return 0;
  }

  return Math.max(heightPercent * scale, minPx);
}

export const RITMO_CYCLE_MAX_VOLUME_BAR_PX = getRitmoCycleVolumeBarHeightPx(
  "fuerte",
  RITMO_CYCLE_VOLUME_BAR_SCALE,
);

export const RITMO_TIMELINE_PATTERN_ROW_PX = Math.max(
  getRitmoCycleVolumeBarHeightPx("fuerte", RITMO_TIMELINE_VOLUME_BAR_SCALE),
  14,
);

/** Contenedor de controles por golpe debajo del gráfico del ciclo. */
export const COMPAS_SLOT_CONTROLS_CLASS =
  "mt-4 flex w-full flex-col rounded-[10px] border border-border/70 bg-bg-card/90 px-2.5 py-1.5";

/** Variante para el tab de notas: misma caja que Nota objetivo, dentro del ciclo. */
export const COMPAS_SLOT_NOTE_CONTROLS_CLASS =
  "mt-4 flex w-full flex-col rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3";

/** Layout compartido del cuerpo de carruseles dentro del slot de compás. */
export const COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS = "flex items-center gap-1";
