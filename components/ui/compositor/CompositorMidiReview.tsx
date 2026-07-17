"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCycleNameDialog } from "@/components/ui/compositor/CompositorCycleNameDialog";
import { CompositorMidiBlockConflictDetail } from "@/components/ui/compositor/CompositorMidiBlockConflictDetail";
import { CompositorMidiSourceTrackRow } from "@/components/ui/compositor/CompositorMidiSourceTrackRow";
import { CompositorTonalidadSelect } from "@/components/ui/compositor/CompositorTonalidadSelect";
import { CompositorTrackTimeline } from "@/components/ui/compositor/CompositorTrackTimeline";
import { TapButton } from "@/components/ui/TapFeedback";
import type { MidiImportFocusTarget } from "@/hooks/useCompositorMidiImport";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  getCompositorTrack,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import type { MidiImportConflict, MidiImportSession } from "@/lib/compositor-midi";
import {
  getConflictsForInstrument,
  midiAssignmentBelongsToInstrument,
} from "@/lib/compositor-midi/conflicts";
import type { NotaIndex } from "@/lib/cifrado";
import {
  COMPOSITOR_LABEL_GUARDAR_CICLO_IMPORT,
  COMPOSITOR_LABEL_CONFLICTOS_POR_CAPA,
  COMPOSITOR_LABEL_PISTAS_ARCHIVO,
  COMPOSITOR_LABEL_REVISION_MIDI,
  COMPOSITOR_LABEL_VOLVER_RECORTE_MIDI,
  COMPOSITOR_LABEL_VISTA_PREVIA_IMPORT,
  COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI,
} from "@/lib/ritmo-terminologia";
import { COMPOSITOR_ACTION_BUTTON_CLASS } from "@/lib/compositor-ui";
import { formatDatabaseError } from "@/lib/supabase/errors";
import type { CompositorTimelineEventPatch } from "@/lib/compositor-timeline-layout";
import { BookmarkPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type CompositorMidiReviewProps = {
  session: MidiImportSession;
  focusTarget: MidiImportFocusTarget | null;
  canSave: boolean;
  cyclesBusy: boolean;
  suggestCycleName: () => string;
  onSetTrackAssignment: (
    midiTrackIndex: number,
    instrumentId: CompositorInstrumentId | null,
  ) => void;
  onSetTonalidad: (value: NotaIndex) => void;
  onSetModoTonal: (value: import("@/lib/cifrado-escala").ModoTonal) => void;
  onUpdateDraftEvent: (
    instrumentId: CompositorInstrumentId,
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
  ) => void;
  onRemoveDraftEvent: (
    instrumentId: CompositorInstrumentId,
    eventId: string,
  ) => void;
  onFocusConflict: (conflict: MidiImportConflict) => void;
  onSetFocusTarget: (target: MidiImportFocusTarget | null) => void;
  isPreviewingTrack: boolean;
  previewLoading: boolean;
  cycleProgress: number | null;
  onPreviewLayer: (instrumentId: CompositorInstrumentId) => void;
  onStopPreview: () => void;
  onBackToCrop: () => void;
  onCancel: () => void;
  onSave: (nombre: string) => Promise<unknown>;
};

export function CompositorMidiReview({
  session,
  focusTarget,
  canSave,
  cyclesBusy,
  suggestCycleName,
  onSetTrackAssignment,
  onSetTonalidad,
  onSetModoTonal,
  onUpdateDraftEvent,
  onRemoveDraftEvent,
  onFocusConflict,
  onSetFocusTarget,
  isPreviewingTrack,
  previewLoading,
  cycleProgress,
  onPreviewLayer,
  onStopPreview,
  onBackToCrop,
  onCancel,
  onSave,
}: CompositorMidiReviewProps) {
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTrackId, setActiveTrackId] =
    useState<CompositorInstrumentId>("bateria");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const timelineAnchorRef = useRef<HTMLDivElement>(null);

  const piece = session.draftPiece;
  const highlightEventId = focusTarget?.eventId ?? selectedEventId;

  const globalConflicts = useMemo(
    () => session.conflicts.filter((conflict) => conflict.kind === "empty_import"),
    [session.conflicts],
  );

  const selectedLayers = session.crop.selectedLayers;

  const conflictsByInstrument = useMemo(() => {
    const counts = new Map<CompositorInstrumentId, MidiImportConflict[]>();

    for (const option of COMPOSITOR_INSTRUMENT_OPTIONS) {
      counts.set(
        option.id,
        getConflictsForInstrument(
          option.id,
          session.conflicts,
          session.assignments,
        ),
      );
    }

    return counts;
  }, [session.assignments, session.conflicts]);

  const activeConflicts = conflictsByInstrument.get(activeTrackId) ?? [];

  const assignmentsForActiveLayer = useMemo(
    () =>
      session.assignments.filter((assignment) =>
        midiAssignmentBelongsToInstrument(assignment, activeTrackId),
      ),
    [activeTrackId, session.assignments],
  );

  const tracksWithEvents = useMemo(
    () =>
      COMPOSITOR_INSTRUMENT_OPTIONS.filter(
        (option) =>
          selectedLayers.includes(option.id) &&
          getCompositorTrack(piece, option.id).events.length > 0,
      ),
    [piece, selectedLayers],
  );

  const initializedTabRef = useRef(false);

  useEffect(() => {
    if (initializedTabRef.current) {
      return;
    }

    const firstWithConflicts = COMPOSITOR_INSTRUMENT_OPTIONS.find(
      (option) => (conflictsByInstrument.get(option.id)?.length ?? 0) > 0,
    );

    if (firstWithConflicts) {
      setActiveTrackId(firstWithConflicts.id);
      initializedTabRef.current = true;
      return;
    }

    const firstWithEvents = tracksWithEvents[0];

    if (firstWithEvents) {
      setActiveTrackId(firstWithEvents.id);
    }

    initializedTabRef.current = true;
  }, [conflictsByInstrument, session.fileName, tracksWithEvents]);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    setActiveTrackId(focusTarget.instrumentId);
    setSelectedEventId(focusTarget.eventId);

    const frame = requestAnimationFrame(() => {
      const block = document.querySelector(
        `[data-event-id="${focusTarget.eventId}"]`,
      );

      if (block) {
        block.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }

      timelineAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [focusTarget]);

  const activeLayerEvents = getCompositorTrack(piece, activeTrackId).events;
  const canPreviewActiveLayer = activeLayerEvents.length > 0;

  function handleSelectLayerTab(instrumentId: CompositorInstrumentId) {
    if (isPreviewingTrack) {
      onStopPreview();
    }

    setActiveTrackId(instrumentId);
    setSelectedEventId(null);
    onSetFocusTarget(null);
  }

  function handleConflictClick(conflict: MidiImportConflict) {
    onFocusConflict(conflict);
  }

  async function handleConfirmSave() {
    setSaveError(null);

    try {
      await onSave(saveName);
      setSaveDialogOpen(false);
    } catch (error) {
      setSaveError(
        formatDatabaseError(error, "No se pudo guardar el ciclo importado."),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-compositor-config/30 bg-compositor-config/8 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_REVISION_MIDI}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
          {session.fileName}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">
          {piece.bpm} BPM · {piece.cycleGolpes} golpes ·{" "}
          {session.conflicts.length === 0
            ? "Listo para guardar"
            : `${session.conflicts.length} conflicto${session.conflicts.length === 1 ? "" : "s"} pendiente${session.conflicts.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {globalConflicts.length > 0 ? (
        <ul className="space-y-1 rounded-[10px] border border-[color-mix(in_srgb,var(--tuner-lejos)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-lejos)_8%,var(--bg-card))] px-3 py-2.5">
          {globalConflicts.map((conflict) => (
            <li key={conflict.id}>
              {conflict.target ? (
                <button
                  type="button"
                  onClick={() => handleConflictClick(conflict)}
                  className="w-full rounded-md px-1 py-0.5 text-left text-[11px] leading-snug text-[var(--tuner-lejos)] underline decoration-dotted underline-offset-2 hover:bg-[color-mix(in_srgb,var(--tuner-lejos)_10%,transparent)]"
                >
                  {conflict.message}
                </button>
              ) : (
                <p className="px-1 text-[11px] leading-snug text-[var(--tuner-lejos)]">
                  {conflict.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Golpes del ciclo
          </span>
          <p className="min-h-9 rounded-lg border border-border bg-bg-dark px-2 py-2 text-sm text-text-primary">
            {session.cycleGolpes}
          </p>
        </div>
        <CompositorTonalidadSelect
          tonalidadComposicion={session.tonalidadComposicion}
          modoTonalComposicion={session.modoTonalComposicion}
          showLabel
          onTonalidadChange={onSetTonalidad}
          onModoTonalChange={onSetModoTonal}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_CONFLICTOS_POR_CAPA}
        </p>
        <div
          className="mb-3 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label={COMPOSITOR_LABEL_CONFLICTOS_POR_CAPA}
        >
          {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
            const count = conflictsByInstrument.get(option.id)?.length ?? 0;
            const isActive = activeTrackId === option.id;

            return (
              <TapButton
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectLayerTab(option.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  isActive
                    ? "bg-compositor-config/20 text-compositor-config"
                    : "bg-bg-dark text-text-muted"
                }`}
              >
                {option.label} ({count})
              </TapButton>
            );
          })}
        </div>

        {activeConflicts.length > 0 ? (
          <ul className="mb-3 space-y-1 rounded-[10px] border border-[color-mix(in_srgb,var(--tuner-lejos)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-lejos)_8%,var(--bg-card))] px-3 py-2.5">
            {activeConflicts.map((conflict) => (
              <li key={conflict.id}>
                {conflict.target ? (
                  <button
                    type="button"
                    onClick={() => handleConflictClick(conflict)}
                    className="w-full rounded-md px-1 py-0.5 text-left text-[11px] leading-snug text-[var(--tuner-lejos)] underline decoration-dotted underline-offset-2 hover:bg-[color-mix(in_srgb,var(--tuner-lejos)_10%,transparent)]"
                  >
                    {conflict.message}
                  </button>
                ) : (
                  <p className="px-1 text-[11px] leading-snug text-[var(--tuner-lejos)]">
                    {conflict.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 rounded-[10px] border border-[color-mix(in_srgb,var(--tuner-cerca)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-cerca)_8%,var(--bg-card))] px-3 py-2.5 text-[11px] text-[var(--tuner-cerca)]">
            Sin conflictos en esta capa.
          </p>
        )}

        {assignmentsForActiveLayer.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
              {COMPOSITOR_LABEL_PISTAS_ARCHIVO}
            </p>
            <div className="space-y-2">
              {assignmentsForActiveLayer.map((assignment) => (
                <CompositorMidiSourceTrackRow
                  key={assignment.midiTrackIndex}
                  assignment={assignment}
                  conflicts={session.conflicts}
                  eventSources={session.eventSources}
                  allowedLayers={selectedLayers}
                  showConflicts={false}
                  onAssignmentChange={(instrumentId) =>
                    onSetTrackAssignment(assignment.midiTrackIndex, instrumentId)
                  }
                  onConflictClick={handleConflictClick}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={timelineAnchorRef}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_VISTA_PREVIA_IMPORT}
        </p>

        {tracksWithEvents.length === 0 ? (
          <p className="rounded-[10px] border border-border bg-bg-card px-3 py-4 text-sm text-text-muted">
            Asigná las pistas del archivo a una capa para ver la vista previa.
          </p>
        ) : (
          <>
            <CompositorMidiBlockConflictDetail
              selectedEventId={highlightEventId}
              instrumentId={activeTrackId}
              piece={piece}
              conflicts={session.conflicts}
            />
            <CompositorTrackTimeline
            piece={piece}
            instrumentId={activeTrackId}
            events={activeLayerEvents}
            selectedEventIds={selectedEventId ? [selectedEventId] : []}
            highlightEventId={highlightEventId}
            cycleProgress={isPreviewingTrack ? cycleProgress : null}
            octaveExact={true}
            disabled={false}
            capasMode="none"
            placementMode={null}
            isPreviewingTrack={isPreviewingTrack}
            previewDisabled={
              previewLoading || cyclesBusy || !canPreviewActiveLayer
            }
            onPreviewTrack={() => {
              if (isPreviewingTrack) {
                onStopPreview();
                return;
              }

              onPreviewLayer(activeTrackId);
            }}
            onSelectEventIds={(eventIds) => {
              setSelectedEventId(eventIds[0] ?? null);
              onSetFocusTarget(null);
            }}
            onUpdateEvent={(
              eventId: string,
              patch: CompositorTimelineEventPatch,
            ) => onUpdateDraftEvent(activeTrackId, eventId, patch)}
            onUpdateEvents={(updates) => {
              for (const { eventId, patch } of updates) {
                onUpdateDraftEvent(activeTrackId, eventId, patch);
              }
            }}
            onRemoveEvents={(eventIds) => {
              for (const eventId of eventIds) {
                onRemoveDraftEvent(activeTrackId, eventId);
              }
            }}
          />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <TapButton
          type="button"
          disabled={!canSave || cyclesBusy}
          onClick={() => {
            setSaveError(null);
            setSaveName(suggestCycleName());
            setSaveDialogOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs disabled:opacity-40 ${COMPOSITOR_ACTION_BUTTON_CLASS}`}
        >
          <BookmarkPlus className="size-4" aria-hidden="true" />
          {COMPOSITOR_LABEL_GUARDAR_CICLO_IMPORT}
        </TapButton>
        <TapButton
          type="button"
          disabled={cyclesBusy}
          onClick={onBackToCrop}
          className="rounded-full border border-border bg-bg-darker px-4 py-2 text-xs font-bold text-text-muted disabled:opacity-40"
        >
          {COMPOSITOR_LABEL_VOLVER_RECORTE_MIDI}
        </TapButton>
        <TapButton
          type="button"
          disabled={cyclesBusy}
          onClick={() => setCancelConfirmOpen(true)}
          className="rounded-full border border-border bg-bg-darker px-4 py-2 text-xs font-bold text-text-muted disabled:opacity-40"
        >
          Cancelar importación
        </TapButton>
      </div>

      <CompositorCycleNameDialog
        open={saveDialogOpen}
        title={COMPOSITOR_LABEL_GUARDAR_CICLO_IMPORT}
        confirmLabel="Guardar"
        value={saveName}
        busy={cyclesBusy}
        error={saveError}
        onChange={setSaveName}
        onConfirm={() => void handleConfirmSave()}
        onCancel={() => {
          if (!cyclesBusy) {
            setSaveDialogOpen(false);
            setSaveError(null);
          }
        }}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        message={COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI}
        confirmLabel="Salir"
        cancelLabel="Seguir revisando"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          setCancelConfirmOpen(false);
          onCancel();
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
