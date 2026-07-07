import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorSlotNote,
  CompositorTrackEvent,
} from "@/lib/compositor";
import { COMPOSITOR_DRUM_SOUND_OPTIONS } from "@/lib/compositor";
import { NOTE_NAMES } from "@/lib/afinador";
import { formatTargetLabel, getNoteIndex } from "@/lib/voz";
import type { NotaIndex } from "@/lib/cifrado";
import {
  clampMelodicOctaveForInstrument,
  melodicPitchFromAbsoluteNote,
} from "@/lib/compositor-melodic-pitch";

export const COMPOSITOR_MELODIC_MIN_ROWS = 3;
export const COMPOSITOR_FULL_PITCH_SPAN = 10;
export const COMPOSITOR_TIMELINE_STEP_MIN_PX = 28;
export const COMPOSITOR_TIMELINE_ROW_HEIGHT_PX = 32;
export const COMPOSITOR_TIMELINE_ROW_LABEL_WIDTH_PX = 18;

export const COMPOSITOR_DRUM_ROW_ORDER: CompositorDrumSound[] = [
  "hihat",
  "hihatOpen",
  "ride",
  "crash",
  "snare",
  "kick",
  "silencio",
];

export type CompositorMelodicRow =
  | {
      id: string;
      kind: "pitch";
      pitchIndex: number;
      label: string;
    }
  | {
      id: string;
      kind: "pitchOctave";
      pitchIndex: number;
      octave: number;
      label: string;
    }
  | {
      id: string;
      kind: "overflow";
      label: string;
    };

export type CompositorDrumRow = {
  id: CompositorDrumSound;
  label: string;
};

function wrapPitchIndex(index: number): number {
  return ((index % 12) + 12) % 12;
}

function pitchLabel(pitchIndex: number, octave?: number, octaveExact = false): string {
  const note = NOTE_NAMES[wrapPitchIndex(pitchIndex)] ?? "C";
  if (octaveExact && octave != null) {
    return formatTargetLabel({ note, octave }, true);
  }
  return note;
}

function getUsedPitchIndices(events: CompositorTrackEvent[]): number[] {
  const indices = new Set<number>();

  for (const event of events) {
    const index = getNoteIndex(event.note.note);
    if (index !== -1) {
      indices.add(index);
    }
  }

  return [...indices].sort((left, right) => left - right);
}

function buildDynamicPitchRange(usedIndices: number[]): number[] {
  if (usedIndices.length === 0) {
    return [0, 4, 7];
  }

  const min = usedIndices[0]!;
  const max = usedIndices[usedIndices.length - 1]!;
  const span = max - min + 1;

  if (span >= COMPOSITOR_FULL_PITCH_SPAN) {
    return Array.from({ length: 12 }, (_, index) => index);
  }

  const paddedMin = wrapPitchIndex(min - 1);
  const paddedMax = wrapPitchIndex(max + 1);
  const rows: number[] = [];

  if (paddedMax >= paddedMin) {
    for (let index = paddedMin; index <= paddedMax; index += 1) {
      rows.push(index);
    }
  } else {
    for (let index = paddedMin; index < 12; index += 1) {
      rows.push(index);
    }
    for (let index = 0; index <= paddedMax; index += 1) {
      rows.push(index);
    }
  }

  while (rows.length < COMPOSITOR_MELODIC_MIN_ROWS) {
    const next = wrapPitchIndex((rows[rows.length - 1] ?? 0) + 1);
    if (rows.includes(next)) {
      break;
    }
    rows.push(next);
  }

  return rows;
}

export function getPrimaryOctave(events: CompositorTrackEvent[]): number {
  const counts = new Map<number, number>();

  for (const event of events) {
    const octave = event.octavaRelativa ?? event.note.octave;
    counts.set(octave, (counts.get(octave) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return 4;
  }

  let bestOctave = 4;
  let bestCount = -1;

  for (const [octave, count] of counts) {
    if (count > bestCount || (count === bestCount && octave < bestOctave)) {
      bestOctave = octave;
      bestCount = count;
    }
  }

  return bestOctave;
}

export function buildMelodicTimelineRows(
  events: CompositorTrackEvent[],
  octaveExact: boolean,
): CompositorMelodicRow[] {
  if (!octaveExact) {
    const pitchIndices = buildDynamicPitchRange(getUsedPitchIndices(events));

    return pitchIndices.map((pitchIndex) => ({
      id: `pitch-${pitchIndex}`,
      kind: "pitch",
      pitchIndex,
      label: pitchLabel(pitchIndex),
    }));
  }

  const primaryOctave = getPrimaryOctave(events);
  const primaryEvents = events.filter(
    (event) => (event.octavaRelativa ?? event.note.octave) === primaryOctave,
  );
  const overflowEvents = events.filter(
    (event) => (event.octavaRelativa ?? event.note.octave) !== primaryOctave,
  );
  const pitchIndices = buildDynamicPitchRange(getUsedPitchIndices(primaryEvents));

  const rows: CompositorMelodicRow[] = pitchIndices.map((pitchIndex) => ({
    id: `pitch-${pitchIndex}-${primaryOctave}`,
    kind: "pitchOctave",
    pitchIndex,
    octave: primaryOctave,
    label: pitchLabel(pitchIndex, primaryOctave, true),
  }));

  if (overflowEvents.length > 0) {
    rows.push({
      id: "overflow",
      kind: "overflow",
      label: "+Oct",
    });
  }

  return rows;
}

export function getMelodicEventRowId(
  event: CompositorTrackEvent,
  rows: CompositorMelodicRow[],
  octaveExact: boolean,
): string {
  const pitchIndex = getNoteIndex(event.note.note);
  const safePitchIndex = pitchIndex === -1 ? 0 : pitchIndex;

  if (!octaveExact) {
    const match = rows.find(
      (row) => row.kind === "pitch" && row.pitchIndex === safePitchIndex,
    );
    return match?.id ?? rows[0]?.id ?? "pitch-0";
  }

  const primaryRow = rows.find(
    (row) =>
      row.kind === "pitchOctave" &&
      row.pitchIndex === safePitchIndex &&
      row.octave === event.note.octave,
  );

  if (primaryRow) {
    return primaryRow.id;
  }

  return rows.find((row) => row.kind === "overflow")?.id ?? rows[0]?.id ?? "overflow";
}

export function buildDrumTimelineRows(): CompositorDrumRow[] {
  const shortLabels: Record<CompositorDrumSound, string> = {
    hihat: "HH",
    hihatOpen: "HO",
    ride: "RD",
    crash: "CR",
    snare: "SN",
    kick: "BD",
    silencio: "—",
  };

  return COMPOSITOR_DRUM_ROW_ORDER.map((id) => ({
    id,
    label: shortLabels[id],
  }));
}

export function getDrumEventRowId(event: CompositorTrackEvent): CompositorDrumSound {
  return event.drumSound;
}

export function getEventMaxDurationSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): number {
  const remaining = Math.max(1, gridSteps - event.startStep);

  if (instrumentId === "bateria") {
    return 1;
  }

  if (
    instrumentId === "guitarra" &&
    event.guitarArticulation === "pua"
  ) {
    return Math.min(remaining, Math.max(1, subdivisionsPerGolpe));
  }

  return remaining;
}

export function clampEventDurationSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  durationSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): number {
  const maxDuration = getEventMaxDurationSteps(
    instrumentId,
    event,
    gridSteps,
    subdivisionsPerGolpe,
  );

  return Math.max(1, Math.min(maxDuration, Math.round(durationSteps)));
}

export function isSustentoEditable(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
): boolean {
  if (instrumentId === "bateria") {
    return false;
  }

  if (
    instrumentId === "guitarra" &&
    event.guitarArticulation === "pua"
  ) {
    return true;
  }

  return (
    instrumentId === "piano" ||
    instrumentId === "guitarra" ||
    instrumentId === "viento"
  );
}

export function getSustentoHelpText(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
): string {
  if (instrumentId === "bateria") {
    return "Los golpes de batería son instantáneos: un paso por sonido.";
  }

  if (instrumentId === "guitarra" && event.guitarArticulation === "pua") {
    return "Con púa el ataque es corto: hasta un golpe de duración.";
  }

  if (instrumentId === "guitarra" && event.guitarArticulation === "dedo") {
    return "Con dedo el bloque puede sostenerse varios pasos del ciclo.";
  }

  if (instrumentId === "guitarra" && event.guitarArticulation === "bloque") {
    return "Con acorde en bloque el sonido puede sostenerse varios pasos del ciclo.";
  }

  if (instrumentId === "guitarra") {
    return "Con rasguido el bloque puede durar varios pasos del ciclo.";
  }

  if (instrumentId === "viento") {
    return "Cuántos pasos sostiene esta nota en el ciclo.";
  }

  return "Cuántos pasos suena este bloque en el ciclo.";
}

export function clampCompositorNoteOctaves(
  note: CompositorSlotNote,
  instrumentId: CompositorInstrumentId,
): CompositorSlotNote {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave =
    instrumentId === "viento" ? 5 : minOctave + 1;
  const octave = Math.max(minOctave, Math.min(maxOctave, note.octave));

  return { ...note, octave };
}

export function canResizeEventSustento(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): boolean {
  if (!isSustentoEditable(instrumentId, event)) {
    return false;
  }

  return (
    getEventMaxDurationSteps(
      instrumentId,
      event,
      gridSteps,
      subdivisionsPerGolpe,
    ) > 1
  );
}

export function computeMovedEventSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  originStartStep: number,
  originDurationSteps: number,
  deltaSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): Pick<CompositorTrackEvent, "startStep" | "durationSteps"> {
  const startStep = Math.max(
    0,
    Math.min(gridSteps - originDurationSteps, originStartStep + deltaSteps),
  );
  const durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep },
    originDurationSteps,
    gridSteps,
    subdivisionsPerGolpe,
  );

  return { startStep, durationSteps };
}

export function computeResizedEndEventSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  originStartStep: number,
  originDurationSteps: number,
  deltaSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): Pick<CompositorTrackEvent, "startStep" | "durationSteps"> {
  const durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep: originStartStep },
    originDurationSteps + deltaSteps,
    gridSteps,
    subdivisionsPerGolpe,
  );

  return {
    startStep: originStartStep,
    durationSteps,
  };
}

export function computeResizedStartEventSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  originStartStep: number,
  originDurationSteps: number,
  deltaSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
): Pick<CompositorTrackEvent, "startStep" | "durationSteps"> {
  const endStep = originStartStep + originDurationSteps;
  let startStep = Math.max(
    0,
    Math.min(endStep - 1, originStartStep + deltaSteps),
  );
  let durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep },
    endStep - startStep,
    gridSteps,
    subdivisionsPerGolpe,
  );
  startStep = Math.max(0, endStep - durationSteps);

  return { startStep, durationSteps };
}

export function pixelDeltaToStepDelta(deltaPx: number): number {
  return Math.round(deltaPx / COMPOSITOR_TIMELINE_STEP_MIN_PX);
}

export function pixelDeltaToRowDelta(
  deltaPx: number,
  rowHeightPx = COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
): number {
  return Math.round(deltaPx / rowHeightPx);
}

export function isMelodicTimelineInstrument(
  instrumentId: CompositorInstrumentId,
): boolean {
  return (
    instrumentId === "piano" ||
    instrumentId === "guitarra" ||
    instrumentId === "viento"
  );
}

function getSecondaryOctave(
  primaryOctave: number,
  instrumentId: CompositorInstrumentId,
): number {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave =
    instrumentId === "viento" ? 5 : minOctave + 1;
  return primaryOctave === minOctave ? maxOctave : minOctave;
}

function getPitchRowAlongDragPath(
  rowsSnapshot: CompositorMelodicRow[],
  originRowIndex: number,
  deltaRows: number,
): CompositorMelodicRow | null {
  if (deltaRows === 0) {
    const originRow = rowsSnapshot[originRowIndex];
    return originRow?.kind === "pitch" || originRow?.kind === "pitchOctave"
      ? originRow
      : null;
  }

  const step = deltaRows > 0 ? 1 : -1;
  let index = originRowIndex;
  let lastPitchRow: CompositorMelodicRow | null = null;

  for (let moved = 0; moved < Math.abs(deltaRows); moved += 1) {
    index += step;

    if (index < 0 || index >= rowsSnapshot.length) {
      break;
    }

    const row = rowsSnapshot[index]!;

    if (row.kind === "pitch" || row.kind === "pitchOctave") {
      lastPitchRow = row;
    }
  }

  return lastPitchRow;
}

export function noteForMelodicTimelineRow(
  row: CompositorMelodicRow,
  originNote: CompositorSlotNote,
  instrumentId: CompositorInstrumentId,
  primaryOctave: number,
  pitchSourceRow: CompositorMelodicRow | null,
): CompositorSlotNote {
  if (row.kind === "pitch") {
    const note = NOTE_NAMES[wrapPitchIndex(row.pitchIndex)] ?? "C";
    return clampCompositorNoteOctaves(
      { note, octave: originNote.octave },
      instrumentId,
    );
  }

  if (row.kind === "pitchOctave") {
    const note = NOTE_NAMES[wrapPitchIndex(row.pitchIndex)] ?? "C";
    return clampCompositorNoteOctaves(
      { note, octave: row.octave },
      instrumentId,
    );
  }

  let pitchIndex: number;

  if (
    pitchSourceRow?.kind === "pitch" ||
    pitchSourceRow?.kind === "pitchOctave"
  ) {
    pitchIndex = pitchSourceRow.pitchIndex;
  } else {
    pitchIndex = getNoteIndex(originNote.note);
    if (pitchIndex === -1) {
      pitchIndex = 0;
    }
  }

  const note = NOTE_NAMES[wrapPitchIndex(pitchIndex)] ?? "C";

  return clampCompositorNoteOctaves(
    {
      note,
      octave: getSecondaryOctave(primaryOctave, instrumentId),
    },
    instrumentId,
  );
}

export type CompositorTimelineEventPatch = Partial<
  Pick<
    CompositorTrackEvent,
    "startStep" | "durationSteps" | "gradoCromatico" | "octavaRelativa" | "note"
  >
>;

export function computeMovedEventPatch(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  originStartStep: number,
  originDurationSteps: number,
  originNote: CompositorSlotNote,
  rowsSnapshot: CompositorMelodicRow[],
  originRowIndex: number,
  deltaSteps: number,
  deltaRows: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  primaryOctave: number,
  tonalidadComposicion: NotaIndex,
): CompositorTimelineEventPatch {
  const timing = computeMovedEventSteps(
    instrumentId,
    event,
    originStartStep,
    originDurationSteps,
    deltaSteps,
    gridSteps,
    subdivisionsPerGolpe,
  );

  if (
    !isMelodicTimelineInstrument(instrumentId) ||
    rowsSnapshot.length === 0 ||
    originRowIndex < 0
  ) {
    return timing;
  }

  const targetRowIndex = Math.max(
    0,
    Math.min(rowsSnapshot.length - 1, originRowIndex + deltaRows),
  );
  const targetRow = rowsSnapshot[targetRowIndex]!;
  const pitchSourceRow = getPitchRowAlongDragPath(
    rowsSnapshot,
    originRowIndex,
    deltaRows,
  );
  const note = noteForMelodicTimelineRow(
    targetRow,
    originNote,
    instrumentId,
    primaryOctave,
    pitchSourceRow,
  );
  const pitch = melodicPitchFromAbsoluteNote(note, tonalidadComposicion);

  return {
    ...timing,
    gradoCromatico: pitch.gradoCromatico,
    octavaRelativa: clampMelodicOctaveForInstrument(
      pitch.octavaRelativa,
      instrumentId,
    ),
  };
}
