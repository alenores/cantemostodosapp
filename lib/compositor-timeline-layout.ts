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
import {
  getInstrumentMaxSustainSeconds,
  maxSustainSecondsToSteps,
} from "@/lib/compositor-sample-sustain";


export const COMPOSITOR_TIMELINE_STEP_MIN_PX = 28;
export const COMPOSITOR_TIMELINE_ROW_HEIGHT_PX = 32;
export const COMPOSITOR_TIMELINE_RULER_HEIGHT_PX = 20;
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

function absoluteMelodicPitch(pitchIndex: number, octave: number): number {
  return octave * 12 + wrapPitchIndex(pitchIndex);
}

function buildGuitarTwoOctaveMelodicRows(): CompositorMelodicRow[] {
  const rows: CompositorMelodicRow[] = [];
  let pitchIndex = 4;
  let octave = 2;

  for (let index = 0; index < 24; index += 1) {
    rows.push({
      id: `pitch-${pitchIndex}-${octave}`,
      kind: "pitchOctave",
      pitchIndex,
      octave,
      label: pitchLabel(pitchIndex, octave, true),
    });
    pitchIndex += 1;

    if (pitchIndex >= 12) {
      pitchIndex = 0;
      octave += 1;
    }
  }

  return rows;
}

export function getMelodicOctaveRange(instrumentId: CompositorInstrumentId): {
  min: number;
  max: number;
} {
  const min =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const max =
    instrumentId === "guitarra" ? 4 : instrumentId === "viento" ? 6 : min + 1;

  return { min, max };
}

export function getVisibleMelodicOctaves(
  instrumentId: CompositorInstrumentId,
): number[] {
  const octaves = new Set<number>();

  for (const row of buildDefaultTwoOctaveMelodicRows(instrumentId)) {
    if (row.kind === "pitchOctave") {
      octaves.add(row.octave);
    }
  }

  return [...octaves].sort((left, right) => left - right);
}

export function buildDefaultTwoOctaveMelodicRows(
  instrumentId: CompositorInstrumentId,
): CompositorMelodicRow[] {
  if (instrumentId === "guitarra") {
    return buildGuitarTwoOctaveMelodicRows();
  }

  const { min, max } = getMelodicOctaveRange(instrumentId);
  const rows: CompositorMelodicRow[] = [];

  for (let octave = min; octave <= max; octave += 1) {
    for (let pitchIndex = 0; pitchIndex < 12; pitchIndex += 1) {
      rows.push({
        id: `pitch-${pitchIndex}-${octave}`,
        kind: "pitchOctave",
        pitchIndex,
        octave,
        label: pitchLabel(pitchIndex, octave, true),
      });
    }
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
  _events: CompositorTrackEvent[],
  octaveExact: boolean,
  instrumentId?: CompositorInstrumentId,
): CompositorMelodicRow[] {
  if (instrumentId) {
    return buildDefaultTwoOctaveMelodicRows(instrumentId);
  }

  if (!octaveExact) {
    return Array.from({ length: 12 }, (_, pitchIndex) => ({
      id: `pitch-${pitchIndex}`,
      kind: "pitch" as const,
      pitchIndex,
      label: pitchLabel(pitchIndex),
    }));
  }

  return buildDefaultTwoOctaveMelodicRows("piano");
}

function findNearestMelodicRowId(
  rows: CompositorMelodicRow[],
  pitchIndex: number,
  octave: number,
): string | undefined {
  const targetPitch = absoluteMelodicPitch(pitchIndex, octave);
  let bestRow: CompositorMelodicRow | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    if (row.kind !== "pitchOctave") {
      continue;
    }

    const distance = Math.abs(
      absoluteMelodicPitch(row.pitchIndex, row.octave) - targetPitch,
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestRow = row;
    }
  }

  return bestRow?.id;
}

export function getMelodicEventRowId(
  event: CompositorTrackEvent,
  rows: CompositorMelodicRow[],
  octaveExact: boolean,
): string {
  const pitchIndex = getNoteIndex(event.note.note);
  const safePitchIndex = pitchIndex === -1 ? 0 : pitchIndex;
  const octave = event.octavaRelativa ?? event.note.octave;

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
      row.octave === octave,
  );

  if (primaryRow) {
    return primaryRow.id;
  }

  return (
    findNearestMelodicRowId(rows, safePitchIndex, octave) ??
    rows[0]?.id ??
    "pitch-0-3"
  );
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
  stepDurationSeconds: number,
): number {
  const remaining = Math.max(1, gridSteps - event.startStep);

  if (instrumentId === "bateria") {
    return 1;
  }

  const maxSeconds = getInstrumentMaxSustainSeconds(
    instrumentId,
    event.guitarArticulation,
  );

  return maxSustainSecondsToSteps(maxSeconds, stepDurationSeconds, remaining);
}

export function clampEventDurationSteps(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  durationSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  stepDurationSeconds: number,
): number {
  const maxDuration = getEventMaxDurationSteps(
    instrumentId,
    event,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
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
    return "Púa: ataque seco y brillante. El ancho sigue la cola de la cuerda.";
  }

  if (instrumentId === "guitarra" && event.guitarArticulation === "dedo") {
    return "Dedo: ataque suave y cálido. El ancho sigue la cola de la cuerda.";
  }

  if (instrumentId === "guitarra" && event.guitarArticulation === "bloque") {
    return "Bloque: todas las cuerdas del acorde juntas, como un golpe seco.";
  }

  if (instrumentId === "guitarra") {
    return "Rasguido: las cuerdas del acorde en abanico, una detrás de otra.";
  }

  if (instrumentId === "viento") {
    return "Cuánto tiempo sostiene el soplo: el ancho no puede pasar el aliento del sample.";
  }

  return "Cuánto tiempo suena el bloque: el ancho sigue la cola real del instrumento.";
}

export function clampCompositorNoteOctaves(
  note: CompositorSlotNote,
  instrumentId: CompositorInstrumentId,
): CompositorSlotNote {
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave =
    instrumentId === "viento" ? 6 : minOctave + 1;
  const octave = Math.max(minOctave, Math.min(maxOctave, note.octave));

  return { ...note, octave };
}

export function canResizeEventSustento(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  stepDurationSeconds: number,
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
      stepDurationSeconds,
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
  stepDurationSeconds: number,
): Pick<CompositorTrackEvent, "startStep" | "durationSteps"> {
  /** Primero tope de sustento; si no, un bloque “demasiado ancho” no puede moverse. */
  const movableDuration = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep: 0 },
    originDurationSteps,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
  );
  const startStep = Math.max(
    0,
    Math.min(gridSteps - movableDuration, originStartStep + deltaSteps),
  );
  const durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep },
    movableDuration,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
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
  stepDurationSeconds: number,
): Pick<CompositorTrackEvent, "startStep" | "durationSteps"> {
  const durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep: originStartStep },
    originDurationSteps + deltaSteps,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
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
  stepDurationSeconds: number,
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
    stepDurationSeconds,
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
    instrumentId === "guitarra" ? 4 : instrumentId === "viento" ? 6 : minOctave + 1;
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
  stepDurationSeconds: number,
): CompositorTimelineEventPatch {
  const timing = computeMovedEventSteps(
    instrumentId,
    event,
    originStartStep,
    originDurationSteps,
    deltaSteps,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
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

  return {
    ...timing,
    ...melodicPitchPatchForTimelineRow(
      targetRow,
      originNote,
      instrumentId,
      primaryOctave,
      rowsSnapshot,
      originRowIndex,
      deltaRows,
      tonalidadComposicion,
    ),
  };
}

function melodicPitchPatchForTimelineRow(
  targetRow: CompositorMelodicRow,
  originNote: CompositorSlotNote,
  instrumentId: CompositorInstrumentId,
  primaryOctave: number,
  rowsSnapshot: CompositorMelodicRow[],
  originRowIndex: number,
  deltaRows: number,
  tonalidadComposicion: NotaIndex,
): Pick<CompositorTrackEvent, "gradoCromatico" | "octavaRelativa"> {
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
    gradoCromatico: pitch.gradoCromatico,
    octavaRelativa: clampMelodicOctaveForInstrument(
      pitch.octavaRelativa,
      instrumentId,
    ),
  };
}

export function computeMovedEventPatchForMelodicCell(
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
  originDurationSteps: number,
  targetRow: CompositorMelodicRow,
  targetStartStep: number,
  originNote: CompositorSlotNote,
  primaryOctave: number,
  tonalidadComposicion: NotaIndex,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  stepDurationSeconds: number,
): CompositorTimelineEventPatch {
  const movableDuration = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep: 0 },
    originDurationSteps,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
  );
  const startStep = Math.max(
    0,
    Math.min(gridSteps - movableDuration, targetStartStep),
  );
  const durationSteps = clampEventDurationSteps(
    instrumentId,
    { ...event, startStep },
    movableDuration,
    gridSteps,
    subdivisionsPerGolpe,
    stepDurationSeconds,
  );

  if (!isMelodicTimelineInstrument(instrumentId)) {
    return { startStep, durationSteps };
  }

  const pitchSourceRow =
    targetRow.kind === "pitch" || targetRow.kind === "pitchOctave"
      ? targetRow
      : null;
  const note = noteForMelodicTimelineRow(
    targetRow,
    originNote,
    instrumentId,
    primaryOctave,
    pitchSourceRow,
  );
  const pitch = melodicPitchFromAbsoluteNote(note, tonalidadComposicion);

  return {
    startStep,
    durationSteps,
    gradoCromatico: pitch.gradoCromatico,
    octavaRelativa: clampMelodicOctaveForInstrument(
      pitch.octavaRelativa,
      instrumentId,
    ),
  };
}
