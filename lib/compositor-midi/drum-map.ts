import type { CompositorDrumSound } from "@/lib/compositor";

/** General MIDI percussion → timbre del Compositor. */
const GM_DRUM_MAP: Record<number, CompositorDrumSound> = {
  35: "kick",
  36: "kick",
  38: "snare",
  40: "snare",
  42: "hihat",
  44: "hihat",
  46: "hihatOpen",
  49: "crash",
  51: "ride",
  57: "crash",
  59: "ride",
};

export function mapGmDrumMidi(midi: number): CompositorDrumSound | null {
  return GM_DRUM_MAP[midi] ?? null;
}

export function formatGmDrumLabel(midi: number): string {
  return `nota GM ${midi}`;
}
