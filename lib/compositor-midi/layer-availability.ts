import type { CompositorInstrumentId } from "@/lib/compositor";
import { suggestInstrumentFromMidiProgram } from "@/lib/compositor-midi/instrument-map";
import {
  sliceParsedMidiWindow,
  type MidiSliceWindow,
} from "@/lib/compositor-midi/slice";
import {
  MIDI_IMPORT_ALL_LAYERS,
  type MidiImportCropSelection,
  type MidiParsedData,
  type MidiParsedTrack,
} from "@/lib/compositor-midi/types";
import { getSongTotalBeats } from "@/lib/compositor-midi/song-grid";

export function getLayersWithContentInWindow(
  parsed: MidiParsedData,
  window: MidiSliceWindow,
): Set<CompositorInstrumentId> {
  const sliced = sliceParsedMidiWindow(parsed, window);
  const layers = new Set<CompositorInstrumentId>();

  for (const track of sliced.tracks) {
    if (track.notes.length === 0) {
      continue;
    }

    const suggested = suggestInstrumentFromMidiProgram(
      track.programNumber,
      track.isPercussion,
    );

    if (suggested) {
      layers.add(suggested);
    }
  }

  return layers;
}

export function getAvailableLayersForCrop(
  parsed: MidiParsedData,
  crop: Pick<MidiImportCropSelection, "startBeat" | "endBeat">,
): CompositorInstrumentId[] {
  const available = getLayersWithContentInWindow(parsed, {
    startBeat: crop.startBeat,
    endBeat: crop.endBeat,
  });

  return MIDI_IMPORT_ALL_LAYERS.filter((layerId) => available.has(layerId));
}

export function isMidiTrackRelevantToSelectedLayers(
  track: Pick<MidiParsedTrack, "isPercussion" | "programNumber">,
  selectedLayers: CompositorInstrumentId[],
): boolean {
  const selected = new Set(selectedLayers);

  if (selected.size === 0) {
    return false;
  }

  if (track.isPercussion) {
    return selected.has("bateria");
  }

  const suggested = suggestInstrumentFromMidiProgram(
    track.programNumber,
    track.isPercussion,
  );

  if (!suggested) {
    return selectedLayers.some((layerId) => layerId !== "bateria");
  }

  return selected.has(suggested);
}

export function getLayersWithContentInSong(
  parsed: MidiParsedData,
): CompositorInstrumentId[] {
  const totalBeats = getSongTotalBeats(parsed);

  return getAvailableLayersForCrop(parsed, {
    startBeat: 0,
    endBeat: totalBeats,
  });
}

export function reconcileCropLayers(
  parsed: MidiParsedData,
  crop: MidiImportCropSelection,
): MidiImportCropSelection {
  const available = getAvailableLayersForCrop(parsed, crop);
  const availableSet = new Set(available);
  let selectedLayers = crop.selectedLayers.filter((layerId) =>
    availableSet.has(layerId),
  );

  if (selectedLayers.length === 0 && available.length > 0) {
    selectedLayers = [...available];
  }

  return {
    ...crop,
    selectedLayers,
  };
}
