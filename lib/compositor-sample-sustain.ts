import type { CompositorGuitarArticulation, CompositorInstrumentId } from "@/lib/compositor";

/**
 * Tope de sustento audible por instrumento (segundos),
 * basado en la duración útil de los samples densificados.
 * El ancho del bloque no puede superar esto ni el resto del ciclo.
 */
export const COMPOSITOR_MAX_SUSTAIN_SECONDS = {
  piano: 8,
  viento: 7,
  bateria: 0,
  guitarra: {
    pua: 2.5,
    dedo: 4,
    rasguido: 3.5,
    rasguidoArriba: 3.5,
    bloque: 4,
    silencio: 0,
  },
} as const;

export function getInstrumentMaxSustainSeconds(
  instrumentId: CompositorInstrumentId,
  guitarArticulation: CompositorGuitarArticulation = "pua",
): number {
  if (instrumentId === "bateria") {
    return COMPOSITOR_MAX_SUSTAIN_SECONDS.bateria;
  }

  if (instrumentId === "piano") {
    return COMPOSITOR_MAX_SUSTAIN_SECONDS.piano;
  }

  if (instrumentId === "viento") {
    return COMPOSITOR_MAX_SUSTAIN_SECONDS.viento;
  }

  if (instrumentId === "guitarra") {
    return COMPOSITOR_MAX_SUSTAIN_SECONDS.guitarra[guitarArticulation];
  }

  return COMPOSITOR_MAX_SUSTAIN_SECONDS.piano;
}

/** Convierte el tope en segundos a pasos de la grilla del ciclo. */
export function maxSustainSecondsToSteps(
  maxSeconds: number,
  stepDurationSeconds: number,
  remainingSteps: number,
): number {
  if (maxSeconds <= 0) {
    return 1;
  }

  const safeStep = Math.max(stepDurationSeconds, 0.001);
  const bySound = Math.max(1, Math.floor(maxSeconds / safeStep));

  return Math.min(Math.max(1, remainingSteps), bySound);
}
