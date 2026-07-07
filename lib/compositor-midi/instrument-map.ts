import type { CompositorInstrumentId } from "@/lib/compositor";

/** Sugiere capa del Compositor según programa MIDI (GM). */
export function suggestInstrumentFromMidiProgram(
  programNumber: number | null,
  isPercussion: boolean,
): CompositorInstrumentId | null {
  if (isPercussion) {
    return "bateria";
  }

  if (programNumber === null) {
    return null;
  }

  if (programNumber >= 0 && programNumber <= 7) {
    return "piano";
  }

  if (programNumber >= 24 && programNumber <= 31) {
    return "guitarra";
  }

  if (
    programNumber === 73 ||
    (programNumber >= 64 && programNumber <= 79)
  ) {
    return "viento";
  }

  if (programNumber >= 32 && programNumber <= 39) {
    return "bateria";
  }

  return null;
}
