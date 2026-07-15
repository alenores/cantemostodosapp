import { NOTE_NAMES } from "@/lib/afinador";
import type { Modificador, NotaIndex } from "@/lib/cifrado";
import type {
  CompositorGuitarString,
  CompositorSlotNote,
} from "@/lib/compositor";

export type CompositorGuitarVoicingString = {
  string: CompositorGuitarString;
  fret: number;
  note: CompositorSlotNote;
};

export type CompositorGuitarVoicing = {
  shape: "E" | "A";
  strings: CompositorGuitarVoicingString[];
};

const E_SHAPE_INTERVALS: Record<Modificador, readonly number[]> = {
  "": [0, 7, 12, 16, 19, 24],
  m: [0, 7, 12, 15, 19, 24],
  "7": [0, 7, 10, 16, 19, 24],
  m7: [0, 7, 10, 15, 19, 24],
  maj7: [0, 7, 11, 16, 19, 24],
  sus2: [0, 7, 12, 14, 19, 24],
  sus4: [0, 7, 12, 17, 19, 24],
  dim: [0, 6, 12, 15, 18, 24],
  "6": [0, 7, 9, 16, 19, 24],
  add9: [0, 7, 14, 16, 19, 24],
};

const A_SHAPE_INTERVALS: Record<Modificador, readonly number[]> = {
  "": [0, 7, 12, 16, 19],
  m: [0, 7, 12, 15, 19],
  "7": [0, 7, 10, 16, 19],
  m7: [0, 7, 10, 15, 19],
  maj7: [0, 7, 11, 16, 19],
  sus2: [0, 7, 12, 14, 19],
  sus4: [0, 7, 12, 17, 19],
  dim: [0, 6, 12, 15, 18],
  "6": [0, 7, 9, 16, 19],
  add9: [0, 7, 14, 16, 19],
};

const OPEN_STRING_MIDI: Record<CompositorGuitarString, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

function positiveMod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function midiToTarget(midi: number): CompositorSlotNote {
  const safeMidi = Math.max(0, Math.min(127, Math.round(midi)));
  return {
    note: NOTE_NAMES[positiveMod(safeMidi, 12)]!,
    octave: Math.floor(safeMidi / 12) - 1,
  };
}

/**
 * Elige entre las dos cejillas fundamentales de la guitarra.
 * Se prioriza la forma que queda más cerca de la cejuela para evitar
 * inversiones imposibles y mantener el registro natural del instrumento.
 */
export function buildCompositorGuitarVoicing(
  rootIndex: NotaIndex,
  modifier: Modificador,
): CompositorGuitarVoicing {
  const eShapeFret = positiveMod(rootIndex - 4, 12);
  const aShapeFret = positiveMod(rootIndex - 9, 12);
  const useEShape = eShapeFret <= aShapeFret;
  const shape = useEShape ? "E" : "A";
  const rootMidi = (useEShape ? OPEN_STRING_MIDI[6] : OPEN_STRING_MIDI[5]) +
    (useEShape ? eShapeFret : aShapeFret);
  const intervals = useEShape
    ? (E_SHAPE_INTERVALS[modifier] ?? E_SHAPE_INTERVALS[""])
    : (A_SHAPE_INTERVALS[modifier] ?? A_SHAPE_INTERVALS[""]);
  const physicalStrings: CompositorGuitarString[] = useEShape
    ? [6, 5, 4, 3, 2, 1]
    : [5, 4, 3, 2, 1];

  return {
    shape,
    strings: physicalStrings.map((string, index) => {
      const midi = rootMidi + (intervals[index] ?? 0);
      return {
        string,
        fret: midi - OPEN_STRING_MIDI[string],
        note: midiToTarget(midi),
      };
    }),
  };
}

export function getCompositorGuitarVoicingNote(
  voicing: CompositorGuitarVoicing,
  string: CompositorGuitarString,
): CompositorSlotNote | null {
  const exact = voicing.strings.find((entry) => entry.string === string)?.note;

  // En una forma de La la 6ª no se toca: una indicación de "bajo" debe
  // caer en la fundamental de la 5ª, no desaparecer.
  if (!exact && string === 6) {
    return voicing.strings[0]?.note ?? null;
  }

  return exact ?? null;
}
