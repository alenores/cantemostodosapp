import type { NotaIndex } from "@/lib/cifrado";
import type { MidiParsedData, MidiParsedTrack } from "@/lib/compositor-midi/types";

const MIDI_KEY_TO_NOTA_INDEX: Record<string, NotaIndex> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

function parseKeySignature(key: string): NotaIndex | null {
  const normalized = key.trim();
  return MIDI_KEY_TO_NOTA_INDEX[normalized] ?? null;
}

export async function parseMidiArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<MidiParsedData> {
  const { Midi } = await import("@tonejs/midi");
  const midi = new Midi(arrayBuffer);

  const bpm =
    midi.header.tempos[0]?.bpm ??
    (midi.header.tempos.length > 0 ? 120 : 120);

  const timeSignature = midi.header.timeSignatures[0]
    ? {
        numerator: midi.header.timeSignatures[0].timeSignature[0] ?? 4,
        denominator: midi.header.timeSignatures[0].timeSignature[1] ?? 4,
      }
    : null;

  const keySignature =
    midi.header.keySignatures.length > 0
      ? parseKeySignature(midi.header.keySignatures[0]!.key)
      : null;

  const tracks: MidiParsedTrack[] = midi.tracks.map((track, index) => {
    const notes = track.notes.map((note) => ({
      midi: note.midi,
      timeSeconds: note.time,
      durationSeconds: Math.max(0.02, note.duration),
      velocity: note.velocity,
    }));

    return {
      index,
      name: track.name?.trim() || `Pista ${index + 1}`,
      channel: track.channel,
      isPercussion: track.instrument.percussion === true,
      programNumber:
        typeof track.instrument.number === "number"
          ? track.instrument.number
          : null,
      notes,
    };
  });

  return {
    fileName,
    durationSeconds: midi.duration,
    bpm: Math.round(bpm),
    timeSignature,
    keySignature,
    tracks,
  };
}

export function getMidiTracksWithContent(
  parsed: MidiParsedData,
): MidiParsedTrack[] {
  return parsed.tracks.filter((track) => track.notes.length > 0);
}
