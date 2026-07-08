import type { Modificador, NotaIndex } from "@/lib/cifrado";
import type { CompositorInstrumentId, CompositorSlotNote } from "@/lib/compositor";
import { NOTE_NAMES } from "@/lib/afinador";
import { clampTargetOctave, getNoteIndex, type VozTarget } from "@/lib/voz";
import { clampMelodicOctaveForInstrument } from "@/lib/compositor-melodic-pitch";
import {
  DEFAULT_MODO_TONAL,
  getModificadorPorDefecto,
  type ModoTonal,
} from "@/lib/cifrado-escala";

const CHORD_INTERVALS: Record<Modificador, number[]> = {
  "": [0, 4, 7], // mayor
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  "6": [0, 4, 7, 9],
  add9: [0, 4, 7, 14],
};

function transposeTarget(note: VozTarget, semitones: number): VozTarget {
  const baseIndex = getNoteIndex(note.note);
  if (baseIndex === -1) {
    return note;
  }

  const total = baseIndex + semitones;
  const nextIndex = ((total % 12) + 12) % 12;
  const octaveShift = Math.floor(total / 12);
  const nextOctave = clampTargetOctave(note.octave + octaveShift);
  const nextNote = NOTE_NAMES[nextIndex] ?? note.note;
  return { note: nextNote, octave: nextOctave };
}

function clampToInstrument(note: VozTarget, instrumentId: CompositorInstrumentId) {
  if (instrumentId === "bateria") {
    return note;
  }

  return {
    ...note,
    octave: clampMelodicOctaveForInstrument(note.octave, instrumentId),
  };
}

export function buildChordNotesFromRoot(
  root: CompositorSlotNote,
  modifier: Modificador,
  instrumentId: CompositorInstrumentId,
): CompositorSlotNote[] {
  const intervals = CHORD_INTERVALS[modifier] ?? CHORD_INTERVALS[""];

  const notes = intervals.map((semitones) =>
    clampToInstrument(transposeTarget(root, semitones), instrumentId),
  );

  // De-dup por pitch+octava (puede pasar por clamp en rangos chicos)
  const seen = new Set<string>();
  const unique: CompositorSlotNote[] = [];
  for (const item of notes) {
    const key = `${item.note}${item.octave}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function getDefaultChordModifierForRoot(
  rootNoteIndex: NotaIndex,
  tonalidadIndex: NotaIndex,
  modo: ModoTonal = DEFAULT_MODO_TONAL,
): Modificador {
  // Reusa la lógica del cifrado: sugiere mayor/menor/etc. por grado en la escala.
  // Para el compositor, si no hay sugerencia, caemos a mayor.
  return (getModificadorPorDefecto(rootNoteIndex, tonalidadIndex, modo) ??
    "") as Modificador;
}

