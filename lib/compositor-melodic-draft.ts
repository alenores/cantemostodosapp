import type { Modificador, NotaIndex } from "@/lib/cifrado";
import {
  isGuitarChordArticulation,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  clampGradoCromatico,
  gradoToNotaIndex,
  resolveMelodicPitchToNote,
  type CompositorGradoCromatico,
} from "@/lib/compositor-melodic-pitch";
import { getModificadorPorDefecto, type ModoTonal } from "@/lib/cifrado-escala";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

export type CompositorMelodicDraft = {
  gradoCromatico: CompositorGradoCromatico;
  level: MetronomeBeatLevel;
  chordModifier: Modificador;
  pianoHarmonyMode: "nota" | "acorde";
  guitarArticulation: CompositorGuitarArticulation;
};

export function createDefaultMelodicDraft(
  _instrumentId: CompositorInstrumentId,
): CompositorMelodicDraft {
  return {
    gradoCromatico: 1,
    level: "medio",
    chordModifier: "",
    pianoHarmonyMode: "nota",
    guitarArticulation: "pua",
  };
}

export function normalizeMelodicDraft(
  draft: CompositorMelodicDraft,
  instrumentId: CompositorInstrumentId,
): CompositorMelodicDraft {
  if (isMelodicAcordeMode(instrumentId, draft)) {
    return draft;
  }

  return { ...draft, chordModifier: "" };
}

export function draftFromEvent(
  event: CompositorTrackEvent,
  instrumentId: CompositorInstrumentId,
): CompositorMelodicDraft {
  return normalizeMelodicDraft(
    {
      gradoCromatico: clampGradoCromatico(event.gradoCromatico),
      level: event.level,
      chordModifier: (event.chordModifier ?? "") as Modificador,
      pianoHarmonyMode: event.pianoHarmonyMode === "acorde" ? "acorde" : "nota",
      guitarArticulation: event.guitarArticulation,
    },
    instrumentId,
  );
}

export function isMelodicAcordeMode(
  instrumentId: CompositorInstrumentId,
  draft: CompositorMelodicDraft,
): boolean {
  if (instrumentId === "piano") {
    return draft.pianoHarmonyMode === "acorde";
  }

  if (instrumentId === "guitarra") {
    return isGuitarChordArticulation(draft.guitarArticulation);
  }

  return false;
}

export function suggestedChordModifier(
  grado: CompositorGradoCromatico,
  tonalidad: NotaIndex,
  modo: ModoTonal = "mayor",
): Modificador {
  const noteIndex = gradoToNotaIndex(grado, tonalidad);
  return (getModificadorPorDefecto(noteIndex, tonalidad, modo) ?? "") as Modificador;
}

export function applyPianoHarmonyMode(
  draft: CompositorMelodicDraft,
  mode: "nota" | "acorde",
  tonalidad: NotaIndex,
  modo: ModoTonal = "mayor",
): CompositorMelodicDraft {
  const next: CompositorMelodicDraft = {
    ...draft,
    pianoHarmonyMode: mode,
  };

  if (mode === "acorde") {
    next.chordModifier = suggestedChordModifier(
      draft.gradoCromatico,
      tonalidad,
      modo,
    );
  } else {
    next.chordModifier = "";
  }

  return next;
}

export function applyGuitarHarmonyMode(
  draft: CompositorMelodicDraft,
  mode: "nota" | "acorde",
  tonalidad: NotaIndex,
  modo: ModoTonal = "mayor",
): CompositorMelodicDraft {
  if (mode === "acorde") {
    return {
      ...draft,
      guitarArticulation: "rasguido",
      chordModifier: suggestedChordModifier(
        draft.gradoCromatico,
        tonalidad,
        modo,
      ),
    };
  }

  return {
    ...draft,
    guitarArticulation:
      isGuitarChordArticulation(draft.guitarArticulation) ||
      draft.guitarArticulation === "silencio"
        ? "pua"
        : draft.guitarArticulation,
    chordModifier: "",
  };
}

export function applyGradoToDraft(
  draft: CompositorMelodicDraft,
  grado: CompositorGradoCromatico,
  instrumentId: CompositorInstrumentId,
  tonalidad: NotaIndex,
  modo: ModoTonal = "mayor",
): CompositorMelodicDraft {
  const next = { ...draft, gradoCromatico: grado };

  if (isMelodicAcordeMode(instrumentId, next)) {
    next.chordModifier = suggestedChordModifier(grado, tonalidad, modo);
  } else {
    next.chordModifier = "";
  }

  return next;
}

export function draftToEventPatch(
  draft: CompositorMelodicDraft,
  instrumentId: CompositorInstrumentId,
  tonalidad: NotaIndex,
  octavaRelativa: number,
): Partial<CompositorTrackEvent> {
  const normalized = normalizeMelodicDraft(draft, instrumentId);
  const note = resolveMelodicPitchToNote(
    { gradoCromatico: normalized.gradoCromatico, octavaRelativa },
    tonalidad,
  );
  const isAcorde = isMelodicAcordeMode(instrumentId, normalized);

  return {
    gradoCromatico: normalized.gradoCromatico,
    octavaRelativa,
    note,
    level: normalized.level,
    chordModifier: isAcorde ? normalized.chordModifier : "",
    pianoHarmonyMode: normalized.pianoHarmonyMode,
    guitarArticulation: normalized.guitarArticulation,
  };
}
