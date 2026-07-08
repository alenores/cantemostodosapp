import {
  COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
  createCompositorEvent,
  createEmptyCompositorTrack,
  type CompositorDrumSound,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { midiToNoteName } from "@/lib/afinador";
import { DEFAULT_TONALIDAD, normalizeNotaIndex, type NotaIndex } from "@/lib/cifrado";
import { DEFAULT_MODO_TONAL, normalizeModoTonal } from "@/lib/cifrado-escala";
import { melodicPitchFromAbsoluteNote } from "@/lib/compositor-melodic-pitch";
import { createVozTarget } from "@/lib/voz";
import {
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  METRONOME_PATTERN_LENGTH,
} from "@/lib/metronomo";
import { mapGmDrumMidi } from "@/lib/compositor-midi/drum-map";
import { isMidiTrackRelevantToSelectedLayers } from "@/lib/compositor-midi/layer-availability";
import { suggestInstrumentFromMidiProgram } from "@/lib/compositor-midi/instrument-map";
import {
  durationSecondsToSteps,
  getGridSteps,
  secondsToStep,
} from "@/lib/compositor-midi/quantize";
import type {
  MidiConvertOptions,
  MidiParsedNote,
  MidiParsedTrack,
  MidiTrackAssignment,
} from "@/lib/compositor-midi/types";
import { getMidiTracksWithContent } from "@/lib/compositor-midi/parse";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

function velocityToLevel(velocity: number): MetronomeBeatLevel {
  if (velocity <= 0) {
    return "silencio";
  }

  if (velocity < 0.35) {
    return "suave";
  }

  if (velocity < 0.7) {
    return "medio";
  }

  return "fuerte";
}

function midiNumberToTarget(midi: number) {
  const name = midiToNoteName(midi);
  const octave = Math.floor(midi / 12) - 1;
  return createVozTarget(name, octave);
}

function createMelodicEvent(
  note: MidiParsedNote,
  instrumentId: CompositorInstrumentId,
  piece: CompositorPiece,
  tonalidadComposicion: NotaIndex,
): CompositorTrackEvent {
  const target = midiNumberToTarget(note.midi);
  const pitch = melodicPitchFromAbsoluteNote(target, tonalidadComposicion);
  const startStep = secondsToStep(note.timeSeconds, piece);
  const durationSteps = durationSecondsToSteps(note.durationSeconds, piece);

  const base = createCompositorEvent({
    startStep,
    durationSteps,
    level: velocityToLevel(note.velocity),
    gradoCromatico: pitch.gradoCromatico,
    octavaRelativa: pitch.octavaRelativa,
    note: target,
    pianoHarmonyMode: "nota",
    guitarArticulation: "pua",
  });

  if (instrumentId === "guitarra") {
    return { ...base, guitarArticulation: "pua" };
  }

  return base;
}

function createDrumEvent(
  note: MidiParsedNote,
  piece: CompositorPiece,
  drumSound: CompositorDrumSound,
): CompositorTrackEvent {
  return createCompositorEvent({
    startStep: secondsToStep(note.timeSeconds, piece),
    durationSteps: 1,
    level: velocityToLevel(note.velocity),
    drumSound,
  });
}

export function buildDefaultAssignments(
  parsed: import("@/lib/compositor-midi/types").MidiParsedData,
  selectedLayers: CompositorInstrumentId[] = [
    "bateria",
    "guitarra",
    "piano",
    "viento",
  ],
): MidiTrackAssignment[] {
  return getMidiTracksWithContent(parsed)
    .filter((track) => isMidiTrackRelevantToSelectedLayers(track, selectedLayers))
    .map((track) => {
      const suggested = suggestInstrumentFromMidiProgram(
        track.programNumber,
        track.isPercussion,
      );
      const assignedInstrumentId =
        suggested && selectedLayers.includes(suggested) ? suggested : null;

      return {
        midiTrackIndex: track.index,
        midiTrackName: track.name,
        isPercussion: track.isPercussion,
        programNumber: track.programNumber,
        suggestedInstrumentId: suggested,
        assignedInstrumentId,
      };
    });
}

export function inferCycleGolpes(
  parsed: import("@/lib/compositor-midi/types").MidiParsedData,
): number {
  const numerator = parsed.timeSignature?.numerator ?? 4;
  return Math.max(1, Math.min(10, numerator));
}

export function inferTonalidad(
  parsed: import("@/lib/compositor-midi/types").MidiParsedData,
): NotaIndex {
  if (parsed.keySignature !== null) {
    return normalizeNotaIndex(parsed.keySignature);
  }

  return DEFAULT_TONALIDAD;
}

export type MidiConvertResult = {
  piece: CompositorPiece;
  /** eventId → índice de pista MIDI de origen */
  eventSources: Map<string, number>;
};

export function convertMidiToCompositorPiece(
  options: MidiConvertOptions,
): MidiConvertResult {
  const {
    parsed,
    assignments,
    tonalidadComposicion,
    modoTonalComposicion = DEFAULT_MODO_TONAL,
    cycleGolpes,
    selectedLayers,
    subdivisionsPerGolpe = COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
  } = options;

  const gridSteps = getGridSteps(cycleGolpes, subdivisionsPerGolpe);

  const piece: CompositorPiece = {
    version: 2,
    bpm: Math.max(40, Math.min(240, Math.round(parsed.bpm))),
    cycleGolpes,
    cycleBeatDurations: METRONOME_BEAT_DURATION_PATTERN_DEFAULT.slice(
      0,
      METRONOME_PATTERN_LENGTH,
    ),
    subdivisionsPerGolpe,
    tonalidadComposicion,
    modoTonalComposicion: normalizeModoTonal(modoTonalComposicion),
    tracks: [
      createEmptyCompositorTrack("bateria", true),
      createEmptyCompositorTrack("guitarra", true),
      createEmptyCompositorTrack("piano", true),
      createEmptyCompositorTrack("viento", true),
    ].map((track) => ({
      ...track,
      enabled: selectedLayers.includes(track.instrumentId),
    })),
  };

  const eventsByInstrument = new Map<CompositorInstrumentId, CompositorTrackEvent[]>(
    piece.tracks.map((track) => [track.instrumentId, []]),
  );
  const eventSources = new Map<string, number>();

  for (const assignment of assignments) {
    const track = parsed.tracks.find(
      (entry) => entry.index === assignment.midiTrackIndex,
    );

    if (!track || track.notes.length === 0) {
      continue;
    }

    if (!isMidiTrackRelevantToSelectedLayers(track, selectedLayers)) {
      continue;
    }

    if (!assignment.assignedInstrumentId) {
      continue;
    }

    const instrumentId = assignment.assignedInstrumentId;

    if (!selectedLayers.includes(instrumentId)) {
      continue;
    }

    const bucket = eventsByInstrument.get(instrumentId) ?? [];

    for (const note of track.notes) {
      if (instrumentId === "bateria") {
        const drumSound = mapGmDrumMidi(note.midi);
        const eventId = createEventIdForMidiNote(track, note);

        if (!drumSound) {
          const event = createCompositorEvent({
            id: eventId,
            startStep: secondsToStep(note.timeSeconds, piece),
            durationSteps: 1,
            level: velocityToLevel(note.velocity),
            drumSound: "kick",
          });
          bucket.push(event);
          eventSources.set(event.id, track.index);
          continue;
        }

        const event = createDrumEvent(note, piece, drumSound);
        const withId = { ...event, id: eventId };
        bucket.push(withId);
        eventSources.set(withId.id, track.index);
        continue;
      }

      const event = createMelodicEvent(
        note,
        instrumentId,
        piece,
        tonalidadComposicion,
      );
      const withId = {
        ...event,
        id: createEventIdForMidiNote(track, note),
      };
      bucket.push(withId);
      eventSources.set(withId.id, track.index);
    }

    eventsByInstrument.set(instrumentId, bucket);
  }

  return {
    piece: {
      ...piece,
      tracks: piece.tracks.map((track) => ({
        ...track,
        events: (eventsByInstrument.get(track.instrumentId) ?? []).sort(
          (left, right) => left.startStep - right.startStep,
        ),
      })),
    },
    eventSources,
  };
}

function createEventIdForMidiNote(track: MidiParsedTrack, note: MidiParsedNote): string {
  return `midi-${track.index}-${note.midi}-${Math.round(note.timeSeconds * 1000)}`;
}

export { createEventIdForMidiNote };
