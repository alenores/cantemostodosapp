import {
  beatToSeconds,
  getSongTotalBeats,
} from "@/lib/compositor-midi/song-grid";
import type { MidiParsedData, MidiParsedNote } from "@/lib/compositor-midi/types";

export type MidiSliceWindow = {
  startBeat: number;
  endBeat: number;
};

function clipNoteToWindow(
  note: MidiParsedNote,
  startSeconds: number,
  endSeconds: number,
): MidiParsedNote | null {
  const noteStart = note.timeSeconds;
  const noteEnd = note.timeSeconds + note.durationSeconds;

  if (noteEnd <= startSeconds || noteStart >= endSeconds) {
    return null;
  }

  const clippedStart = Math.max(noteStart, startSeconds);
  const clippedEnd = Math.min(noteEnd, endSeconds);

  return {
    ...note,
    timeSeconds: clippedStart - startSeconds,
    durationSeconds: Math.max(0.02, clippedEnd - clippedStart),
  };
}

export function sliceParsedMidiWindow(
  parsed: MidiParsedData,
  window: MidiSliceWindow,
): MidiParsedData {
  const startSeconds = beatToSeconds(window.startBeat, parsed);
  const endSeconds = beatToSeconds(window.endBeat, parsed);
  const windowDuration = Math.max(0.02, endSeconds - startSeconds);

  const tracks = parsed.tracks.map((track) => ({
    ...track,
    notes: track.notes
      .map((note) => clipNoteToWindow(note, startSeconds, endSeconds))
      .filter((note): note is MidiParsedNote => note !== null),
  }));

  return {
    ...parsed,
    durationSeconds: windowDuration,
    tracks,
  };
}

export function slicedWindowHasNotes(parsed: MidiParsedData): boolean {
  return parsed.tracks.some((track) => track.notes.length > 0);
}

export function assertSliceWindowInSong(
  parsed: MidiParsedData,
  window: MidiSliceWindow,
): void {
  const totalBeats = getSongTotalBeats(parsed);

  if (window.startBeat < 0 || window.endBeat > totalBeats) {
    throw new Error("La ventana de recorte queda fuera de la canción.");
  }
}
