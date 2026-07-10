import { normalizeNotaIndex, NOTAS_ES, type NotaIndex } from "@/lib/cifrado";
import { getNumeroCromaticoDesdeTonica } from "@/lib/cifrado-escala";
import type { CompositorInstrumentId } from "@/lib/compositor";
import { clampTargetOctave, getNoteIndex, type VozTarget } from "@/lib/voz";
import { NOTE_NAMES } from "@/lib/afinador";

export type CompositorGradoCromatico =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type CompositorMelodicPitch = {
  gradoCromatico: CompositorGradoCromatico;
  octavaRelativa: number;
};

export const COMPOSITOR_GRADO_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const grado = (index + 1) as CompositorGradoCromatico;

  return {
    id: grado,
    label: String(grado),
  };
});

export function clampGradoCromatico(value: number): CompositorGradoCromatico {
  return Math.max(1, Math.min(12, Math.round(value))) as CompositorGradoCromatico;
}

export function gradoToNotaIndex(
  grado: number,
  tonalidadIndex: NotaIndex,
): NotaIndex {
  return normalizeNotaIndex(tonalidadIndex + clampGradoCromatico(grado) - 1);
}

export function resolveMelodicPitchToNote(
  pitch: CompositorMelodicPitch,
  tonalidadIndex: NotaIndex,
): VozTarget {
  const noteIndex = gradoToNotaIndex(pitch.gradoCromatico, tonalidadIndex);
  const note = NOTE_NAMES[noteIndex] ?? "C";

  return {
    note,
    octave: clampTargetOctave(pitch.octavaRelativa),
  };
}

export function melodicPitchFromAbsoluteNote(
  note: VozTarget,
  tonalidadIndex: NotaIndex,
): CompositorMelodicPitch {
  const noteIndex = getNoteIndex(note.note);

  if (noteIndex === -1) {
    return { gradoCromatico: 1, octavaRelativa: clampTargetOctave(note.octave) };
  }

  return {
    gradoCromatico: clampGradoCromatico(
      getNumeroCromaticoDesdeTonica(noteIndex as NotaIndex, tonalidadIndex),
    ),
    octavaRelativa: clampTargetOctave(note.octave),
  };
}

export function clampMelodicOctaveForInstrument(
  octave: number,
  instrumentId: CompositorInstrumentId,
): number {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave =
    instrumentId === "guitarra" ? 4 : instrumentId === "viento" ? 6 : minOctave + 1;

  return Math.max(minOctave, Math.min(maxOctave, Math.round(octave)));
}

export function formatCompositorGradoLabel(
  grado: number,
  octava?: number,
): string {
  if (octava === undefined) {
    return String(clampGradoCromatico(grado));
  }

  return `${clampGradoCromatico(grado)}·${octava}`;
}

export function formatCompositorGradoResolvedLabel(
  pitch: CompositorMelodicPitch,
  tonalidadIndex: NotaIndex,
): string {
  const note = resolveMelodicPitchToNote(pitch, tonalidadIndex);
  const noteIndex = gradoToNotaIndex(pitch.gradoCromatico, tonalidadIndex);

  return `${formatCompositorGradoLabel(pitch.gradoCromatico, pitch.octavaRelativa)} (${NOTAS_ES[noteIndex]}${note.octave})`;
}

export function isMelodicCompositorInstrument(
  instrumentId: CompositorInstrumentId,
): boolean {
  return (
    instrumentId === "piano" ||
    instrumentId === "guitarra" ||
    instrumentId === "viento"
  );
}

export function resolveEventMelodicNote(
  event: {
    gradoCromatico?: number;
    octavaRelativa?: number;
    note?: VozTarget;
  },
  tonalidadIndex: NotaIndex,
  instrumentId: CompositorInstrumentId,
): VozTarget {
  if (isMelodicCompositorInstrument(instrumentId)) {
    const pitch =
      typeof event.gradoCromatico === "number" &&
      typeof event.octavaRelativa === "number"
        ? {
            gradoCromatico: clampGradoCromatico(event.gradoCromatico),
            octavaRelativa: clampMelodicOctaveForInstrument(
              event.octavaRelativa,
              instrumentId,
            ),
          }
        : melodicPitchFromAbsoluteNote(
            event.note ?? { note: "C", octave: 4 },
            tonalidadIndex,
          );

    return resolveMelodicPitchToNote(pitch, tonalidadIndex);
  }

  return event.note ?? { note: "C", octave: 4 };
}
