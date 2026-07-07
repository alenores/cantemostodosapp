import { METRONOME_PATTERN_LENGTH } from "@/lib/metronomo";
import type { MidiImportCropSelection, MidiParsedData } from "@/lib/compositor-midi/types";

export const MIDI_IMPORT_MAX_CYCLE_GOLPES = METRONOME_PATTERN_LENGTH;

export function getSongSecondsPerBeat(parsed: MidiParsedData): number {
  const bpm = Math.max(1, parsed.bpm);
  return 60 / bpm;
}

export function getSongBeatsPerBar(parsed: MidiParsedData): number {
  return Math.max(1, parsed.timeSignature?.numerator ?? 4);
}

export function beatToSeconds(beat: number, parsed: MidiParsedData): number {
  return beat * getSongSecondsPerBeat(parsed);
}

export function secondsToBeat(seconds: number, parsed: MidiParsedData): number {
  const secondsPerBeat = getSongSecondsPerBeat(parsed);

  if (secondsPerBeat <= 0) {
    return 0;
  }

  return seconds / secondsPerBeat;
}

export function snapBeat(rawBeat: number, parsed: MidiParsedData): number {
  const totalBeats = getSongTotalBeats(parsed);
  return Math.max(0, Math.min(totalBeats, Math.round(rawBeat)));
}

export function getSongTotalBeats(parsed: MidiParsedData): number {
  const secondsPerBeat = getSongSecondsPerBeat(parsed);

  if (secondsPerBeat <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(parsed.durationSeconds / secondsPerBeat));
}

export function formatSongBeatLabel(beat: number, beatsPerBar: number): string {
  const safeBeat = Math.max(0, beat);
  const bar = Math.floor(safeBeat / beatsPerBar) + 1;
  const golpe = (safeBeat % beatsPerBar) + 1;
  return `Compás ${bar} · Golpe ${golpe}`;
}

export function getCropWindowGolpes(crop: Pick<MidiImportCropSelection, "startBeat" | "endBeat">): number {
  return Math.max(0, crop.endBeat - crop.startBeat);
}

export type CropWindowHandle = "start" | "end";

/** Acopla la ventana al mover un extremo; el otro queda fijo. */
export function clampCropWindow(
  startBeat: number,
  endBeat: number,
  totalBeats: number,
  movedHandle: CropWindowHandle,
  maxGolpes: number = MIDI_IMPORT_MAX_CYCLE_GOLPES,
): { startBeat: number; endBeat: number } {
  let start = Math.round(startBeat);
  let end = Math.round(endBeat);

  if (movedHandle === "start") {
    const minStart = Math.max(0, end - maxGolpes);
    const maxStart = end - 1;
    start = Math.max(minStart, Math.min(maxStart, start));
  } else {
    const minEnd = start + 1;
    const maxEnd = Math.min(totalBeats, start + maxGolpes);
    end = Math.max(minEnd, Math.min(maxEnd, end));
  }

  return { startBeat: start, endBeat: end };
}

/** Traslada la ventana manteniendo el mismo largo en golpes. */
export function translateCropWindow(
  startBeat: number,
  endBeat: number,
  deltaBeats: number,
  totalBeats: number,
): { startBeat: number; endBeat: number } {
  const windowSize = endBeat - startBeat;

  if (windowSize <= 0) {
    return { startBeat, endBeat };
  }

  let newStart = Math.round(startBeat + deltaBeats);
  newStart = Math.max(0, Math.min(totalBeats - windowSize, newStart));

  return {
    startBeat: newStart,
    endBeat: newStart + windowSize,
  };
}

export function isCropWindowTooLong(
  crop: Pick<MidiImportCropSelection, "startBeat" | "endBeat">,
): boolean {
  return getCropWindowGolpes(crop) > MIDI_IMPORT_MAX_CYCLE_GOLPES;
}

export type MidiCropValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateCropSelection(
  crop: MidiImportCropSelection,
  parsed: MidiParsedData,
): MidiCropValidationResult {
  if (crop.selectedLayers.length === 0) {
    return {
      ok: false,
      message: "Elegí al menos una capa para el ciclo.",
    };
  }

  if (crop.endBeat <= crop.startBeat) {
    return {
      ok: false,
      message: "El final del recorte debe ser posterior al inicio.",
    };
  }

  if (isCropWindowTooLong(crop)) {
    return {
      ok: false,
      message: `El ciclo no puede superar ${MIDI_IMPORT_MAX_CYCLE_GOLPES} golpes. Ajustá la selección.`,
    };
  }

  const totalBeats = getSongTotalBeats(parsed);

  if (crop.startBeat < 0 || crop.endBeat > totalBeats) {
    return {
      ok: false,
      message: "La ventana de recorte queda fuera de la canción.",
    };
  }

  return { ok: true };
}

export function getNoteDensityByBeat(parsed: MidiParsedData): number[] {
  const totalBeats = getSongTotalBeats(parsed);
  const counts = Array.from({ length: totalBeats }, () => 0);

  for (const track of parsed.tracks) {
    for (const note of track.notes) {
      const startBeat = Math.floor(secondsToBeat(note.timeSeconds, parsed));
      const endBeat = Math.ceil(
        secondsToBeat(note.timeSeconds + note.durationSeconds, parsed),
      );

      for (
        let beat = Math.max(0, startBeat);
        beat < Math.min(totalBeats, endBeat);
        beat += 1
      ) {
        counts[beat] = (counts[beat] ?? 0) + 1;
      }
    }
  }

  return counts;
}

export function createDefaultCropSelection(parsed: MidiParsedData): MidiImportCropSelection {
  const beatsPerBar = getSongBeatsPerBar(parsed);
  const totalBeats = getSongTotalBeats(parsed);
  const endBeat = Math.max(1, Math.min(beatsPerBar, totalBeats));

  return {
    selectedLayers: ["bateria", "guitarra", "piano", "viento"],
    startBeat: 0,
    endBeat,
  };
}
