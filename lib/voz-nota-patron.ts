import {
  clampPatternLength,
  METRONOME_PATTERN_LENGTH,
} from "@/lib/metronomo";
import {
  formatTargetLabel,
  VOZ_DEFAULT_TARGET,
  type VozTarget,
} from "@/lib/voz";

export const VOZ_NOTA_PATTERN_LENGTH = METRONOME_PATTERN_LENGTH;

export type VozNotaPattern = VozTarget[];

export const VOZ_NOTA_PATTERN_DEFAULT: VozNotaPattern = [
  { note: "C", octave: 4 },
  { note: "D", octave: 4 },
  { note: "E", octave: 4 },
  { note: "F", octave: 4 },
  { note: "G", octave: 4 },
  { note: "A", octave: 4 },
  { note: "B", octave: 4 },
  { note: "C", octave: 5 },
  { note: "D", octave: 5 },
  { note: "E", octave: 5 },
];

export function normalizeNotaPattern(
  pattern: VozTarget[],
  fallback: VozTarget = VOZ_DEFAULT_TARGET,
): VozNotaPattern {
  const normalized = pattern.slice(0, VOZ_NOTA_PATTERN_LENGTH);

  while (normalized.length < VOZ_NOTA_PATTERN_LENGTH) {
    const index = normalized.length;
    normalized.push(
      VOZ_NOTA_PATTERN_DEFAULT[index] ?? {
        note: fallback.note,
        octave: fallback.octave,
      },
    );
  }

  return normalized;
}

export function getActiveNotaSlice(
  pattern: VozNotaPattern,
  patternLength: number,
): VozTarget[] {
  return normalizeNotaPattern(pattern).slice(
    0,
    clampPatternLength(patternLength),
  );
}

export function setNotaAtSlot(
  pattern: VozNotaPattern,
  slotIndex: number,
  target: VozTarget,
): VozNotaPattern {
  const next = normalizeNotaPattern(pattern);
  const index = Math.max(
    0,
    Math.min(VOZ_NOTA_PATTERN_LENGTH - 1, slotIndex),
  );
  next[index] = target;
  return next;
}

export function resizeNotaPatternLength(
  pattern: VozNotaPattern,
  currentLength: number,
  nextLength: number,
  fallback: VozTarget = VOZ_DEFAULT_TARGET,
): VozNotaPattern {
  const normalized = normalizeNotaPattern(pattern, fallback);
  const clampedLength = clampPatternLength(nextLength);
  const safeCurrent = clampPatternLength(currentLength);

  for (let index = safeCurrent; index < clampedLength; index += 1) {
    normalized[index] =
      VOZ_NOTA_PATTERN_DEFAULT[index] ?? {
        note: fallback.note,
        octave: fallback.octave,
      };
  }

  return normalized;
}

export function getNotaPatternSummary(
  pattern: VozNotaPattern,
  patternLength: number,
  octaveExact: boolean,
): string {
  const active = getActiveNotaSlice(pattern, patternLength);
  const labels = active.map((target) =>
    formatTargetLabel(target, octaveExact),
  );
  const first = labels[0];

  if (labels.every((label) => label === first)) {
    return first ?? formatTargetLabel(VOZ_DEFAULT_TARGET, octaveExact);
  }

  return labels.join(" · ");
}
