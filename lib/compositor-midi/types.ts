import type { CompositorInstrumentId, CompositorPiece } from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";

export const MIDI_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export const MIDI_IMPORT_ACCEPT =
  ".mid,.midi,audio/midi,audio/x-midi";

export const MIDI_IMPORT_ALL_LAYERS: CompositorInstrumentId[] = [
  "bateria",
  "guitarra",
  "piano",
  "viento",
];

export type MidiParsedNote = {
  midi: number;
  timeSeconds: number;
  durationSeconds: number;
  velocity: number;
};

export type MidiParsedTrack = {
  index: number;
  name: string;
  channel: number;
  isPercussion: boolean;
  programNumber: number | null;
  notes: MidiParsedNote[];
};

export type MidiParsedData = {
  fileName: string;
  durationSeconds: number;
  bpm: number;
  timeSignature: { numerator: number; denominator: number } | null;
  /** Semitonos desde Do (0 = Do mayor), null si no hay meta. */
  keySignature: number | null;
  tracks: MidiParsedTrack[];
};

export type MidiTrackAssignment = {
  midiTrackIndex: number;
  midiTrackName: string;
  isPercussion: boolean;
  programNumber: number | null;
  suggestedInstrumentId: CompositorInstrumentId | null;
  assignedInstrumentId: CompositorInstrumentId | null;
};

export type MidiImportConflictKind =
  | "unassigned_track"
  | "note_out_of_range"
  | "note_outside_cycle"
  | "polyphony_on_monophonic"
  | "event_limit_exceeded"
  | "unmapped_drum_note"
  | "empty_import";

/** Destino al tocar un conflicto en la UI de revisión. */
export type MidiImportConflictTarget = {
  instrumentId: CompositorInstrumentId;
  eventId: string;
  startStep: number;
};

export type MidiImportConflict = {
  id: string;
  kind: MidiImportConflictKind;
  message: string;
  midiTrackIndex?: number;
  target?: MidiImportConflictTarget;
};

export type MidiImportCropSelection = {
  selectedLayers: CompositorInstrumentId[];
  /** Golpe absoluto inclusive desde el inicio de la canción. */
  startBeat: number;
  /** Golpe absoluto exclusive; cycleGolpes = endBeat - startBeat. */
  endBeat: number;
};

export type MidiImportSession = {
  fileName: string;
  /** Fragmento recortado convertido a ciclo. */
  parsed: MidiParsedData;
  crop: MidiImportCropSelection;
  assignments: MidiTrackAssignment[];
  draftPiece: CompositorPiece;
  eventSources: Map<string, number>;
  conflicts: MidiImportConflict[];
  tonalidadComposicion: NotaIndex;
  cycleGolpes: number;
};

export type MidiImportFileSession = {
  fileName: string;
  /** Canción completa en memoria. */
  parsed: MidiParsedData;
  tonalidadComposicion: NotaIndex;
  beatsPerBar: number;
  totalBeats: number;
  step: "crop" | "review";
  crop: MidiImportCropSelection;
  review: MidiImportSession | null;
  /** Aviso breve tras guardar un ciclo (multi-ciclo). */
  saveNotice: string | null;
};

export type MidiConvertOptions = {
  parsed: MidiParsedData;
  assignments: MidiTrackAssignment[];
  tonalidadComposicion: NotaIndex;
  cycleGolpes: number;
  selectedLayers: CompositorInstrumentId[];
  subdivisionsPerGolpe?: number;
};
