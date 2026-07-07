import type { CompositorDrumSound, CompositorTrackEvent } from "@/lib/compositor";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

export type CompositorDrumDraft = {
  drumSound: CompositorDrumSound;
  level: MetronomeBeatLevel;
};

export function createDefaultDrumDraft(): CompositorDrumDraft {
  return {
    drumSound: "kick",
    level: "medio",
  };
}

export function drumDraftFromEvent(event: CompositorTrackEvent): CompositorDrumDraft {
  return {
    drumSound: event.drumSound,
    level: event.level,
  };
}

export function drumDraftToEventPatch(
  draft: CompositorDrumDraft,
): Partial<CompositorTrackEvent> {
  return {
    drumSound: draft.drumSound,
    level: draft.level,
  };
}
