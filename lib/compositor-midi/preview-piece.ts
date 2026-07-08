import {
  buildDefaultAssignments,
  convertMidiToCompositorPiece,
} from "@/lib/compositor-midi/convert";
import { getCropWindowGolpes } from "@/lib/compositor-midi/song-grid";
import {
  sliceParsedMidiWindow,
  slicedWindowHasNotes,
} from "@/lib/compositor-midi/slice";
import type { CompositorPiece } from "@/lib/compositor";
import type { MidiImportFileSession } from "@/lib/compositor-midi/types";

export function cropSelectionHasPreviewNotes(
  fileSession: MidiImportFileSession,
): boolean {
  const sliced = sliceParsedMidiWindow(fileSession.parsed, {
    startBeat: fileSession.crop.startBeat,
    endBeat: fileSession.crop.endBeat,
  });

  return slicedWindowHasNotes(sliced);
}

export function buildCropPreviewPiece(
  fileSession: MidiImportFileSession,
): CompositorPiece | null {
  const { parsed, crop, tonalidadComposicion, modoTonalComposicion } = fileSession;

  const sliced = sliceParsedMidiWindow(parsed, {
    startBeat: crop.startBeat,
    endBeat: crop.endBeat,
  });

  if (!slicedWindowHasNotes(sliced)) {
    return null;
  }

  const cycleGolpes = getCropWindowGolpes(crop);
  const assignments = buildDefaultAssignments(sliced, crop.selectedLayers);

  const { piece } = convertMidiToCompositorPiece({
    parsed: sliced,
    assignments,
    tonalidadComposicion,
    modoTonalComposicion,
    cycleGolpes,
    selectedLayers: crop.selectedLayers,
  });

  return piece;
}
