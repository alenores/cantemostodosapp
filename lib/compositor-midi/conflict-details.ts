import {
  COMPOSITOR_MAX_EVENTS_PER_TRACK,
  getInstrumentLabel,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { getGridSteps } from "@/lib/compositor-midi/quantize";
import type { MidiImportConflict } from "@/lib/compositor-midi/types";

export type MidiImportConflictDetail = {
  title: string;
  description: string;
  suggestion: string;
};

function getMelodicOctaveBounds(instrumentId: CompositorInstrumentId): {
  min: number;
  max: number;
} {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave = instrumentId === "viento" ? 6 : minOctave + 1;
  return { min: minOctave, max: maxOctave };
}

export function getConflictsForBlock(
  eventId: string,
  conflicts: MidiImportConflict[],
): MidiImportConflict[] {
  return conflicts.filter((conflict) => conflict.target?.eventId === eventId);
}

export function describeMidiImportConflict(
  conflict: MidiImportConflict,
  options: {
    instrumentId: CompositorInstrumentId;
    piece: CompositorPiece;
    event?: CompositorTrackEvent | null;
  },
): MidiImportConflictDetail {
  const { instrumentId, piece, event } = options;
  const layerLabel = getInstrumentLabel(instrumentId);
  const gridSteps = getGridSteps(piece.cycleGolpes, piece.subdivisionsPerGolpe);
  const stepLabel =
    event != null ? String(event.startStep + 1) : conflict.target?.startStep != null
      ? String(conflict.target.startStep + 1)
      : "?";

  switch (conflict.kind) {
    case "note_out_of_range": {
      const bounds = getMelodicOctaveBounds(instrumentId);
      const noteLabel =
        event?.note != null
          ? `${event.note.note}${event.note.octave}`
          : "esta nota";

      return {
        title: "Nota fuera del rango de la capa",
        description: `${noteLabel} en el paso ${stepLabel} queda fuera de lo que ${layerLabel} puede reproducir en el compositor (octavas ${bounds.min} a ${bounds.max}). El MIDI trajo una nota más grave o más aguda de lo permitido.`,
        suggestion:
          "Mové el bloque a una octava válida en el gráfico, cambiá la nota manualmente o eliminá este bloque si no lo necesitás en el ciclo.",
      };
    }

    case "note_outside_cycle":
      return {
        title: "Nota fuera del ciclo",
        description: `Este bloque en el paso ${stepLabel} cae más allá de los ${gridSteps} pasos del ciclo (${piece.cycleGolpes} golpes). El compositor solo guarda lo que entra en la ventana que elegiste al recortar.`,
        suggestion:
          "Acortá el bloque, movelo hacia la izquierda dentro del ciclo o volvé al recorte y elegí una ventana más larga (hasta 10 golpes).",
      };

    case "polyphony_on_monophonic":
      return {
        title: "Varias notas al mismo tiempo",
        description: `En el paso ${stepLabel} hay más de una nota melódica en ${layerLabel}. Esta capa, en el modo en que se importó el bloque, admite una sola nota por instante (como una sola voz o una sola cuerda).`,
        suggestion:
          "Eliminá las notas de más en ese paso o dejá solo la que quieras conservar. Si importaste piano, revisá si algún bloque debería ser acorde en lugar de notas sueltas.",
      };

    case "event_limit_exceeded":
      return {
        title: "Demasiados bloques en la capa",
        description: `${layerLabel} ya alcanzó el máximo de ${COMPOSITOR_MAX_EVENTS_PER_TRACK} bloques por ciclo. Este bloque es uno de los que quedaron de más después de ordenar todos los eventos importados.`,
        suggestion:
          "Eliminá bloques que no necesites en esta capa o acortá el recorte del MIDI para traer menos notas.",
      };

    case "unmapped_drum_note":
      return {
        title: "Golpe de batería no reconocido",
        description: `El MIDI tiene un golpe de percusión que no corresponde a ningún timbre de batería del compositor (bombo, redoblante, platillo, etc.) en el paso ${stepLabel}.`,
        suggestion:
          "Eliminá el bloque en el gráfico o reemplazalo por un golpe de batería disponible. Si el golpe no es importante, podés ignorarlo borrándolo.",
      };

    case "unassigned_track":
      return {
        title: "Pista sin capa asignada",
        description:
          conflict.message ||
          "Hay una pista del archivo MIDI que todavía no está asignada a batería, guitarra, piano o viento.",
        suggestion:
          "Elegí una capa en el selector de la pista correspondiente, arriba en esta misma pestaña.",
      };

    case "empty_import":
      return {
        title: "Archivo sin notas",
        description:
          "El archivo MIDI no tiene notas que se puedan importar en el tramo elegido.",
        suggestion: "Volvé al recorte, elegí otro tramo o revisá que el archivo tenga contenido.",
      };

    default:
      return {
        title: "Conflicto de importación",
        description: conflict.message,
        suggestion: "Revisá el bloque en el gráfico o ajustá la asignación de la pista.",
      };
  }
}
