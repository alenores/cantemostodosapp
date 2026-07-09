import type { CSSProperties } from "react";

/** Tamaño base de la letra (coincide con --letra-size en globals.css). */
export const LETRA_ZOOM_BASE_SIZE_PX = 16;

/** Niveles discretos: un paso más chico, moderado, un paso más grande. */
export type LetraZoomLevel = -1 | 0 | 1;

export const LETRA_ZOOM_MIN_LEVEL: LetraZoomLevel = -1;
export const LETRA_ZOOM_MAX_LEVEL: LetraZoomLevel = 1;
export const LETRA_ZOOM_DEFAULT_LEVEL: LetraZoomLevel = 0;

const LETRA_ZOOM_FACTORS: Record<LetraZoomLevel, number> = {
  [-1]: 0.875,
  0: 1,
  1: 1.125,
};

export function getLetraZoomFactor(level: LetraZoomLevel): number {
  return LETRA_ZOOM_FACTORS[level];
}

export function clampLetraZoomLevel(value: number): LetraZoomLevel {
  if (value <= LETRA_ZOOM_MIN_LEVEL) {
    return LETRA_ZOOM_MIN_LEVEL;
  }

  if (value >= LETRA_ZOOM_MAX_LEVEL) {
    return LETRA_ZOOM_MAX_LEVEL;
  }

  return 0;
}

export function getLetraZoomStyle(factor: number): CSSProperties {
  return {
    ["--letra-size" as string]: `${LETRA_ZOOM_BASE_SIZE_PX * factor}px`,
  };
}
