import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { getRitmoComplianceColor } from "@/lib/voz-ritmo";

export type VozIntensidadCompliance = "correcto" | "cerca" | "incorrecto";

export type VozIntensidadVoiceSample = {
  timestamp: number;
  rms: number;
  expectedLevel: MetronomeBeatLevel;
  compliance: VozIntensidadCompliance;
};

export const VOZ_RMS_SILENCE_MAX = 0.01;
/** Umbral más bajo solo para pintar pitch (graves suenan más bajito al mic). */
export const VOZ_RMS_PITCH_AUDIBLE_MIN = 0.005;
const RMS_SUAVE_MAX = 0.028;
const RMS_MEDIO_MAX = 0.06;

export function hasAudibleVoiceVolume(rms: number): boolean {
  return rms >= VOZ_RMS_SILENCE_MAX;
}

export function hasAudiblePitchVolume(rms: number): boolean {
  return rms >= VOZ_RMS_PITCH_AUDIBLE_MIN;
}

const LEVEL_RANK: Record<MetronomeBeatLevel, number> = {
  silencio: 0,
  suave: 1,
  medio: 2,
  fuerte: 3,
};

export function rmsToObservedLevel(rms: number): MetronomeBeatLevel {
  if (rms < VOZ_RMS_SILENCE_MAX) {
    return "silencio";
  }

  if (rms < RMS_SUAVE_MAX) {
    return "suave";
  }

  if (rms < RMS_MEDIO_MAX) {
    return "medio";
  }

  return "fuerte";
}

export function getIntensidadVoiceCompliance(
  expectedLevel: MetronomeBeatLevel,
  rms: number,
): VozIntensidadCompliance {
  const observedLevel = rmsToObservedLevel(rms);
  const difference = Math.abs(
    LEVEL_RANK[observedLevel] - LEVEL_RANK[expectedLevel],
  );

  if (difference === 0) {
    return "correcto";
  }

  if (difference === 1) {
    return "cerca";
  }

  return "incorrecto";
}

export function rmsToBarHeightPercent(rms: number): number {
  const normalized = Math.min(1, rms / 0.09);
  return 18 + normalized * 82;
}

export function levelPercentToFilledSegments(
  levelPercent: number,
  segmentCount: number,
): number {
  const clamped = Math.max(0, Math.min(100, levelPercent));
  if (clamped <= 0 || segmentCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil((clamped / 100) * segmentCount));
}

export function getIntensidadComplianceColor(
  compliance: VozIntensidadCompliance,
): string {
  return getRitmoComplianceColor(compliance);
}
