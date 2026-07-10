import {
  COMPOSITOR_MAX_EVENTS_PER_TRACK,
  getInstrumentLabel,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { formatGmDrumLabel, mapGmDrumMidi } from "@/lib/compositor-midi/drum-map";
import {
  getGridSteps,
  isStepOutsideCycle,
  secondsToStep,
} from "@/lib/compositor-midi/quantize";
import { createEventIdForMidiNote } from "@/lib/compositor-midi/convert";
import { isMidiTrackRelevantToSelectedLayers } from "@/lib/compositor-midi/layer-availability";
import type {
  MidiImportConflict,
  MidiImportConflictTarget,
  MidiParsedData,
  MidiTrackAssignment,
} from "@/lib/compositor-midi/types";
import { getMidiTracksWithContent } from "@/lib/compositor-midi/parse";

function createConflictId(parts: string[]): string {
  return parts.join("-");
}

function conflictTarget(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
): MidiImportConflictTarget {
  return {
    instrumentId,
    eventId: event.id,
    startStep: event.startStep,
  };
}

function getMelodicOctaveBounds(instrumentId: CompositorInstrumentId): {
  min: number;
  max: number;
} {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave = instrumentId === "viento" ? 6 : minOctave + 1;
  return { min: minOctave, max: maxOctave };
}

function isMonophonicLayer(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
): boolean {
  if (instrumentId === "viento") {
    return true;
  }

  if (instrumentId === "guitarra") {
    return (
      event.guitarArticulation === "pua" || event.guitarArticulation === "dedo"
    );
  }

  if (instrumentId === "piano") {
    return event.pianoHarmonyMode === "nota";
  }

  return false;
}

function pitchKey(event: CompositorTrackEvent): string {
  return `${event.gradoCromatico}-${event.octavaRelativa}`;
}

export function detectMidiImportConflicts(options: {
  parsed: MidiParsedData;
  assignments: MidiTrackAssignment[];
  piece: CompositorPiece;
  eventSources: Map<string, number>;
  selectedLayers: CompositorInstrumentId[];
}): MidiImportConflict[] {
  const { parsed, piece, eventSources, selectedLayers } = options;
  const assignments = options.assignments.filter((assignment) => {
    const track = parsed.tracks.find(
      (entry) => entry.index === assignment.midiTrackIndex,
    );

    if (!track || track.notes.length === 0) {
      return false;
    }

    return isMidiTrackRelevantToSelectedLayers(track, selectedLayers);
  });
  const selectedLayerSet = new Set(selectedLayers);
  const conflicts: MidiImportConflict[] = [];
  const gridSteps = getGridSteps(piece.cycleGolpes, piece.subdivisionsPerGolpe);
  const tracksWithContent = getMidiTracksWithContent(parsed);

  if (tracksWithContent.length === 0) {
    return [
      {
        id: "empty-import",
        kind: "empty_import",
        message: "El archivo no tiene notas para importar.",
      },
    ];
  }

  for (const assignment of assignments) {
    if (!assignment.assignedInstrumentId) {
      const track = parsed.tracks.find(
        (entry) => entry.index === assignment.midiTrackIndex,
      );

      if (track && track.notes.length > 0) {
        conflicts.push({
          id: createConflictId([
            "unassigned",
            String(assignment.midiTrackIndex),
          ]),
          kind: "unassigned_track",
          midiTrackIndex: assignment.midiTrackIndex,
          message: `Asigná una capa para importar la pista "${assignment.midiTrackName}".`,
        });
      }
    }
  }

  for (const track of piece.tracks) {
    if (!selectedLayerSet.has(track.instrumentId)) {
      continue;
    }

    for (const event of track.events) {
      if (
        isStepOutsideCycle(event.startStep, event.durationSteps, gridSteps)
      ) {
        conflicts.push({
          id: createConflictId([
            "outside",
            track.instrumentId,
            event.id,
          ]),
          kind: "note_outside_cycle",
          midiTrackIndex: eventSources.get(event.id),
          target: conflictTarget(track.instrumentId, event),
          message: `Nota en el paso ${event.startStep + 1} queda fuera del ciclo (${gridSteps} pasos).`,
        });
      }

      if (track.instrumentId !== "bateria") {
        const bounds = getMelodicOctaveBounds(track.instrumentId);
        const rawOctave = event.octavaRelativa;

        if (rawOctave < bounds.min || rawOctave > bounds.max) {
          conflicts.push({
            id: createConflictId(["range", track.instrumentId, event.id]),
            kind: "note_out_of_range",
            midiTrackIndex: eventSources.get(event.id),
            target: conflictTarget(track.instrumentId, event),
            message: `Nota ${event.note.note}${event.note.octave} fuera del rango de ${getInstrumentLabel(track.instrumentId)} (octavas ${bounds.min}–${bounds.max}).`,
          });
        }
      }
    }

    const sorted = [...track.events].sort(
      (left, right) => left.startStep - right.startStep,
    );

    if (sorted.length > COMPOSITOR_MAX_EVENTS_PER_TRACK) {
      const overflow = sorted.slice(COMPOSITOR_MAX_EVENTS_PER_TRACK);
      for (const event of overflow) {
        conflicts.push({
          id: createConflictId(["limit", track.instrumentId, event.id]),
          kind: "event_limit_exceeded",
          midiTrackIndex: eventSources.get(event.id),
          target: conflictTarget(track.instrumentId, event),
          message: `Bloque en ${getInstrumentLabel(track.instrumentId)} supera el máximo de ${COMPOSITOR_MAX_EVENTS_PER_TRACK} eventos por capa.`,
        });
      }
    }

    const byStep = new Map<number, CompositorTrackEvent[]>();

    for (const event of track.events) {
      const list = byStep.get(event.startStep) ?? [];
      list.push(event);
      byStep.set(event.startStep, list);
    }

    for (const [step, eventsAtStep] of byStep) {
      const monophonicEvents = eventsAtStep.filter((event) =>
        isMonophonicLayer(track.instrumentId, event),
      );

      if (monophonicEvents.length <= 1) {
        continue;
      }

      const seen = new Set<string>();
      let first = true;

      for (const event of monophonicEvents) {
        const key = pitchKey(event);

        if (first) {
          first = false;
          seen.add(key);
          continue;
        }

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        conflicts.push({
          id: createConflictId([
            "poly",
            track.instrumentId,
            event.id,
            String(step),
          ]),
          kind: "polyphony_on_monophonic",
          midiTrackIndex: eventSources.get(event.id),
          target: conflictTarget(track.instrumentId, event),
          message: `Varias notas simultáneas en ${getInstrumentLabel(track.instrumentId)} (paso ${step + 1}); esta capa admite una sola nota.`,
        });
      }
    }
  }

  for (const assignment of assignments) {
    if (!selectedLayerSet.has("bateria")) {
      break;
    }

    if (assignment.assignedInstrumentId !== "bateria") {
      continue;
    }

    const midiTrack = parsed.tracks.find(
      (entry) => entry.index === assignment.midiTrackIndex,
    );

    if (!midiTrack) {
      continue;
    }

    for (const note of midiTrack.notes) {
      if (mapGmDrumMidi(note.midi)) {
        continue;
      }

      const eventId = createEventIdForMidiNote(midiTrack, note);
      const pieceTrack = piece.tracks.find(
        (entry) => entry.instrumentId === "bateria",
      );
      const matched = pieceTrack?.events.find((event) => event.id === eventId);

      conflicts.push({
        id: createConflictId([
          "drum",
          String(midiTrack.index),
          String(note.midi),
          String(Math.round(note.timeSeconds * 1000)),
        ]),
        kind: "unmapped_drum_note",
        midiTrackIndex: midiTrack.index,
        target: matched
          ? conflictTarget("bateria", matched)
          : undefined,
        message: `${formatGmDrumLabel(note.midi)} sin timbre equivalente en batería (paso ${secondsToStep(note.timeSeconds, piece) + 1}).`,
      });
    }
  }

  return conflicts;
}

export function resolveConflictInstrumentId(
  conflict: MidiImportConflict,
  assignments: MidiTrackAssignment[],
): CompositorInstrumentId | null {
  if (conflict.kind === "empty_import") {
    return null;
  }

  if (conflict.target) {
    return conflict.target.instrumentId;
  }

  if (conflict.midiTrackIndex === undefined) {
    return conflict.kind === "unmapped_drum_note" ? "bateria" : null;
  }

  const assignment = assignments.find(
    (entry) => entry.midiTrackIndex === conflict.midiTrackIndex,
  );

  if (!assignment) {
    return conflict.kind === "unmapped_drum_note" ? "bateria" : null;
  }

  if (assignment.assignedInstrumentId) {
    return assignment.assignedInstrumentId;
  }

  if (assignment.isPercussion) {
    return "bateria";
  }

  return assignment.suggestedInstrumentId;
}

export function getConflictsForInstrument(
  instrumentId: CompositorInstrumentId,
  conflicts: MidiImportConflict[],
  assignments: MidiTrackAssignment[],
): MidiImportConflict[] {
  return conflicts.filter((conflict) => {
    if (conflict.kind === "empty_import") {
      return false;
    }

    return resolveConflictInstrumentId(conflict, assignments) === instrumentId;
  });
}

export function midiAssignmentBelongsToInstrument(
  assignment: MidiTrackAssignment,
  instrumentId: CompositorInstrumentId,
): boolean {
  if (assignment.assignedInstrumentId === instrumentId) {
    return true;
  }

  if (assignment.assignedInstrumentId) {
    return false;
  }

  if (assignment.isPercussion) {
    return instrumentId === "bateria";
  }

  return assignment.suggestedInstrumentId === instrumentId;
}

export function conflictBelongsToMidiTrack(
  conflict: MidiImportConflict,
  midiTrackIndex: number,
  eventSources: Map<string, number>,
): boolean {
  if (conflict.midiTrackIndex === midiTrackIndex) {
    return true;
  }

  if (conflict.target) {
    return eventSources.get(conflict.target.eventId) === midiTrackIndex;
  }

  return false;
}

export function getConflictsForMidiTrack(
  midiTrackIndex: number,
  conflicts: MidiImportConflict[],
  eventSources: Map<string, number>,
): MidiImportConflict[] {
  return conflicts.filter((conflict) =>
    conflictBelongsToMidiTrack(conflict, midiTrackIndex, eventSources),
  );
}

export function getMidiTrackStatus(
  midiTrackIndex: number,
  conflicts: MidiImportConflict[],
  eventSources: Map<string, number>,
): "ok" | "conflict" {
  return getConflictsForMidiTrack(midiTrackIndex, conflicts, eventSources)
    .length > 0
    ? "conflict"
    : "ok";
}

export function hasUnresolvedMidiConflicts(
  conflicts: MidiImportConflict[],
): boolean {
  return conflicts.length > 0;
}
