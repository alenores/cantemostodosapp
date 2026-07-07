"use client";

import {
  cloneCompositorPiece,
  normalizeCompositorPiece,
  removeCompositorTrackEvent,
  updateCompositorTrackEvent,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";
import {
  buildDefaultAssignments,
  convertMidiToCompositorPiece,
  createDefaultCropSelection,
  detectMidiImportConflicts,
  getCropWindowGolpes,
  getSongBeatsPerBar,
  getSongTotalBeats,
  hasUnresolvedMidiConflicts,
  inferTonalidad,
  MIDI_IMPORT_MAX_BYTES,
  parseMidiArrayBuffer,
  reconcileCropLayers,
  sliceParsedMidiWindow,
  slicedWindowHasNotes,
  validateCropSelection,
  type MidiImportConflict,
  type MidiImportCropSelection,
  type MidiImportFileSession,
  type MidiImportSession,
  type MidiTrackAssignment,
} from "@/lib/compositor-midi";
import { useCallback, useRef, useState } from "react";
import { COMPOSITOR_NOTICE_CICLO_GUARDADO_MIDI } from "@/lib/ritmo-terminologia";

function rebuildReviewSession(base: {
  fileName: string;
  parsed: MidiImportSession["parsed"];
  crop: MidiImportCropSelection;
  assignments: MidiTrackAssignment[];
  tonalidadComposicion: NotaIndex;
}): MidiImportSession {
  const cycleGolpes = getCropWindowGolpes(base.crop);

  const { piece, eventSources } = convertMidiToCompositorPiece({
    parsed: base.parsed,
    assignments: base.assignments,
    tonalidadComposicion: base.tonalidadComposicion,
    cycleGolpes,
    selectedLayers: base.crop.selectedLayers,
  });

  const conflicts = detectMidiImportConflicts({
    parsed: base.parsed,
    assignments: base.assignments,
    piece,
    eventSources,
    selectedLayers: base.crop.selectedLayers,
  });

  return {
    fileName: base.fileName,
    parsed: base.parsed,
    crop: base.crop,
    assignments: base.assignments,
    draftPiece: piece,
    eventSources,
    conflicts,
    tonalidadComposicion: base.tonalidadComposicion,
    cycleGolpes,
  };
}

export type MidiImportFocusTarget = {
  instrumentId: CompositorInstrumentId;
  eventId: string;
  startStep: number;
};

function withReconciledCrop(
  session: MidiImportFileSession,
  crop: MidiImportCropSelection,
): MidiImportFileSession {
  return {
    ...session,
    crop: reconcileCropLayers(session.parsed, crop),
    saveNotice: null,
  };
}

export function useCompositorMidiImport() {
  const [fileSession, setFileSession] = useState<MidiImportFileSession | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<MidiImportFocusTarget | null>(
    null,
  );
  const fileSessionRef = useRef(fileSession);
  fileSessionRef.current = fileSession;

  const reviewSession =
    fileSession?.step === "review" ? fileSession.review : null;

  const discardSession = useCallback(() => {
    setFileSession(null);
    setError(null);
    setFocusTarget(null);
    setLoading(false);
  }, []);

  const startImport = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFocusTarget(null);

    try {
      if (file.size > MIDI_IMPORT_MAX_BYTES) {
        throw new Error("El archivo MIDI no puede superar 5 MB.");
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "mid" && extension !== "midi") {
        throw new Error("Elegí un archivo .mid o .midi.");
      }

      const buffer = await file.arrayBuffer();
      const parsed = await parseMidiArrayBuffer(buffer, file.name);
      const tonalidadComposicion = inferTonalidad(parsed);
      const beatsPerBar = getSongBeatsPerBar(parsed);
      const totalBeats = getSongTotalBeats(parsed);
      const crop = reconcileCropLayers(
        parsed,
        createDefaultCropSelection(parsed),
      );

      const next: MidiImportFileSession = {
        fileName: file.name,
        parsed,
        tonalidadComposicion,
        beatsPerBar,
        totalBeats,
        step: "crop",
        crop,
        review: null,
        saveNotice: null,
      };

      setFileSession(next);
      return next;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "No se pudo leer el archivo MIDI.";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const setCropLayers = useCallback((selectedLayers: CompositorInstrumentId[]) => {
    setFileSession((current) => {
      if (!current || current.step !== "crop") {
        return current;
      }

      return withReconciledCrop(current, {
        ...current.crop,
        selectedLayers,
      });
    });
  }, []);

  const setCropWindow = useCallback((startBeat: number, endBeat: number) => {
    setFileSession((current) => {
      if (!current || current.step !== "crop") {
        return current;
      }

      return withReconciledCrop(current, {
        ...current.crop,
        startBeat,
        endBeat,
      });
    });
  }, []);

  const confirmCrop = useCallback((): string | null => {
    const current = fileSessionRef.current;

    if (!current || current.step !== "crop") {
      return "No hay una importación activa.";
    }

    const validation = validateCropSelection(current.crop, current.parsed);

    if (!validation.ok) {
      return validation.message;
    }

    const sliced = sliceParsedMidiWindow(current.parsed, {
      startBeat: current.crop.startBeat,
      endBeat: current.crop.endBeat,
    });

    if (!slicedWindowHasNotes(sliced)) {
      return "No hay notas en la ventana seleccionada. Ajustá el recorte o las capas.";
    }

    const assignments = buildDefaultAssignments(
      sliced,
      current.crop.selectedLayers,
    );

    const review = rebuildReviewSession({
      fileName: current.fileName,
      parsed: sliced,
      crop: current.crop,
      assignments,
      tonalidadComposicion: current.tonalidadComposicion,
    });

    setFocusTarget(null);
    setFileSession({
      ...current,
      step: "review",
      review,
      saveNotice: null,
    });

    return null;
  }, []);

  const backToCrop = useCallback(() => {
    setFocusTarget(null);
    setFileSession((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        step: "crop",
        review: null,
        crop: reconcileCropLayers(current.parsed, current.crop),
      };
    });
  }, []);

  const recomputeReview = useCallback(
    (updater: (current: MidiImportSession) => MidiImportSession) => {
      setFileSession((current) => {
        if (!current?.review) {
          return current;
        }

        const review = updater(current.review);

        return {
          ...current,
          review,
        };
      });
    },
    [],
  );

  const setTrackAssignment = useCallback(
    (
      midiTrackIndex: number,
      assignedInstrumentId: CompositorInstrumentId | null,
    ) => {
      recomputeReview((current) => {
        const assignments = current.assignments.map((entry) =>
          entry.midiTrackIndex === midiTrackIndex
            ? { ...entry, assignedInstrumentId }
            : entry,
        );

        return rebuildReviewSession({
          fileName: current.fileName,
          parsed: current.parsed,
          crop: current.crop,
          assignments,
          tonalidadComposicion: current.tonalidadComposicion,
        });
      });
    },
    [recomputeReview],
  );

  const setTonalidad = useCallback(
    (tonalidadComposicion: NotaIndex) => {
      recomputeReview((current) =>
        rebuildReviewSession({
          fileName: current.fileName,
          parsed: current.parsed,
          crop: current.crop,
          assignments: current.assignments,
          tonalidadComposicion,
        }),
      );
    },
    [recomputeReview],
  );

  const updateDraftEvent = useCallback(
    (
      instrumentId: CompositorInstrumentId,
      eventId: string,
      patch: Partial<CompositorTrackEvent>,
    ) => {
      recomputeReview((current) => {
        const updated = updateCompositorTrackEvent(
          current.draftPiece,
          instrumentId,
          eventId,
          patch,
        );

        const conflicts = detectMidiImportConflicts({
          parsed: current.parsed,
          assignments: current.assignments,
          piece: updated,
          eventSources: current.eventSources,
          selectedLayers: current.crop.selectedLayers,
        });

        return {
          ...current,
          draftPiece: updated,
          conflicts,
        };
      });
    },
    [recomputeReview],
  );

  const removeDraftEvent = useCallback(
    (instrumentId: CompositorInstrumentId, eventId: string) => {
      recomputeReview((current) => {
        const updated = removeCompositorTrackEvent(
          current.draftPiece,
          instrumentId,
          eventId,
        );
        const nextSources = new Map(current.eventSources);
        nextSources.delete(eventId);

        const conflicts = detectMidiImportConflicts({
          parsed: current.parsed,
          assignments: current.assignments,
          piece: updated,
          eventSources: nextSources,
          selectedLayers: current.crop.selectedLayers,
        });

        return {
          ...current,
          draftPiece: updated,
          eventSources: nextSources,
          conflicts,
        };
      });
    },
    [recomputeReview],
  );

  const focusConflict = useCallback((conflict: MidiImportConflict) => {
    if (!conflict.target) {
      return;
    }

    setFocusTarget({
      instrumentId: conflict.target.instrumentId,
      eventId: conflict.target.eventId,
      startStep: conflict.target.startStep,
    });
  }, []);

  const getPieceForSave = useCallback((): CompositorPiece | null => {
    const current = fileSessionRef.current?.review;

    if (!current || hasUnresolvedMidiConflicts(current.conflicts)) {
      return null;
    }

    return normalizeCompositorPiece(cloneCompositorPiece(current.draftPiece));
  }, []);

  const completeSaveAndReturnToCrop = useCallback(() => {
    setFocusTarget(null);
    setFileSession((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        step: "crop",
        review: null,
        crop: reconcileCropLayers(current.parsed, current.crop),
        saveNotice: COMPOSITOR_NOTICE_CICLO_GUARDADO_MIDI,
      };
    });
  }, []);

  return {
    fileSession,
    reviewSession,
    loading,
    error,
    focusTarget,
    setFocusTarget,
    inMidiImport: fileSession !== null,
    inMidiCrop: fileSession?.step === "crop",
    inMidiReview: fileSession?.step === "review",
    canSave: reviewSession
      ? !hasUnresolvedMidiConflicts(reviewSession.conflicts)
      : false,
    startImport,
    discardSession,
    setCropLayers,
    setCropWindow,
    confirmCrop,
    backToCrop,
    setTrackAssignment,
    setTonalidad,
    updateDraftEvent,
    removeDraftEvent,
    focusConflict,
    getPieceForSave,
    completeSaveAndReturnToCrop,
  };
};
