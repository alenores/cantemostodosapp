"use client";

import { CompositorCapasTabs } from "@/components/ui/compositor/CompositorCapasStrip";
import { CompositorMelodicInstrumentSelect } from "@/components/ui/compositor/CompositorMelodicInstrumentSelect";
import { CompositorDrumEditPanel } from "@/components/ui/compositor/CompositorDrumEditPanel";
import { CompositorMelodicConfigPanel } from "@/components/ui/compositor/CompositorMelodicConfigPanel";
import { CompositorTimelineBlock } from "@/components/ui/compositor/CompositorTimelineBlock";
import {
  CompositorScrollableTimelineGrid,
  getTimelineBlockLayout,
} from "@/components/ui/compositor/CompositorScrollableTimelineGrid";
import { CompositorTimelineMinimap } from "@/components/ui/compositor/CompositorTimelineMinimap";
import { CompositorTonalidadSelect } from "@/components/ui/compositor/CompositorTonalidadSelect";
import { compositorHasContenidoTab } from "@/components/ui/compositor/CompositorSlotDetail";
import { useCompositorPalettePlacement } from "@/components/ui/compositor/useCompositorPalettePlacement";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { CompositorCapaInlineToggle } from "@/components/ui/compositor/CompositorCapaInlineToggle";
import { getCompositorTimelineBlockClassName } from "@/lib/compositor-instrument-colors";
import type {
  CompositorInstrumentId,
  CompositorMelodicInstrumentId,
  CompositorPiece,
  CompositorTrackEvent,
} from "@/lib/compositor";
import { getInstrumentLabel, isCompositorCycleLayer } from "@/lib/compositor";
import {
  buildDrumTimelineRows,
  buildMelodicTimelineRows,
  COMPOSITOR_TIMELINE_STEP_MIN_PX,
  getDrumEventRowId,
  getMelodicEventRowId,
  getVisibleMelodicOctaves,
  type CompositorTimelineEventPatch,
} from "@/lib/compositor-timeline-layout";
import {
  buildMelodicAddPartial,
  getMelodicRowIdForDraft,
} from "@/lib/compositor-timeline-placement";
import { resolveEventMelodicNote } from "@/lib/compositor-melodic-pitch";
import type { MelodicRowDragContext } from "@/components/ui/compositor/useCompositorTimelineBlockDrag";
import {
  eventOverlapsStep,
  getCompositorCycleDurationSeconds,
  getCompositorGridSteps,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import {
  COMPOSITOR_LABEL_ESCUCHAR_CAPA,
} from "@/lib/ritmo-terminologia";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultMelodicDraft,
  draftFromEvent,
  draftToEventPatch,
  type CompositorMelodicDraft,
} from "@/lib/compositor-melodic-draft";
import {
  createDefaultDrumDraft,
  drumDraftFromEvent,
  drumDraftToEventPatch,
  type CompositorDrumDraft,
} from "@/lib/compositor-drum-draft";

type CompositorTrackTimelineProps = {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  cycleProgress: number | null;
  octaveExact: boolean;
  disabled?: boolean;
  trackAtCapacity?: boolean;
  isPreviewingTrack?: boolean;
  previewDisabled?: boolean;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
  onPlaceEvent?: (
    partial: Partial<CompositorTrackEvent>,
    options?: {
      rowId?: string;
      octaveExact?: boolean;
      selectOnPlace?: boolean;
    },
  ) => string | null;
  onRemoveEvent: (eventId: string) => void;
  onSelectTrack?: (instrumentId: CompositorInstrumentId) => void;
  onPreviewTrack?: () => void;
  capasMode?: "all" | "melodic" | "none";
  placementMode?: "drum" | "melodic" | null;
  tonalidadComposicion?: NotaIndex;
  modoTonalComposicion?: ModoTonal;
  onSetTonalidadComposicion?: (value: NotaIndex) => void;
  onSetModoTonalComposicion?: (value: ModoTonal) => void;
  highlightEventId?: string | null;
  layout?: "default" | "desktop";
  capacityLabel?: string;
  configHeaderTrailing?: React.ReactNode;
};

function renderTimelineBlock({
  event,
  instrumentId,
  piece,
  gridSteps,
  trackWidthPx,
  selectedEventId,
  disabled,
  showNoteLabel,
  highlightEventId,
  melodicRowDrag,
  onSelectEvent,
  onUpdateEvent,
}: {
  event: CompositorTrackEvent;
  instrumentId: CompositorInstrumentId;
  piece: CompositorPiece;
  gridSteps: number;
  trackWidthPx: number;
  selectedEventId: string | null;
  disabled: boolean;
  showNoteLabel: boolean;
  highlightEventId?: string | null;
  melodicRowDrag?: MelodicRowDragContext;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
}) {
  const layout = getTimelineBlockLayout(
    event.startStep,
    event.durationSteps,
    gridSteps,
    trackWidthPx,
  );
  const startSeconds = stepToCycleOffsetSeconds(piece, event.startStep);

  return (
    <CompositorTimelineBlock
      key={event.id}
      event={event}
      instrumentId={instrumentId}
      gridSteps={gridSteps}
      subdivisionsPerGolpe={piece.subdivisionsPerGolpe}
      isSelected={selectedEventId === event.id}
      conflictHighlight={highlightEventId === event.id}
      disabled={disabled}
      title={`Paso ${event.startStep + 1} · ${startSeconds.toFixed(1)} s`}
      leftPercent={layout.leftPercent}
      widthPercent={layout.widthPercent}
      minWidthPercent={layout.minWidthPercent}
      showNoteLabel={showNoteLabel}
      melodicRowDrag={melodicRowDrag}
      onSelect={() => onSelectEvent(event.id)}
      onUpdateTiming={(patch) => onUpdateEvent(event.id, patch)}
    />
  );
}

function MelodicTimeline({
  piece,
  instrumentId,
  events,
  selectedEventId,
  playheadProgress,
  gridSteps,
  octaveExact,
  disabled,
  highlightEventId,
  scrollContainerRef,
  placementPreview,
  onPlacementTap,
  onSelectEvent,
  onUpdateEvent,
}: {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  playheadProgress: number | null;
  gridSteps: number;
  octaveExact: boolean;
  disabled: boolean;
  highlightEventId?: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  placementPreview: ReturnType<
    typeof useCompositorPalettePlacement
  >["placementPreview"];
  onPlacementTap: (clientX: number, clientY: number) => boolean;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
}) {
  const resolvedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        note: resolveEventMelodicNote(
          event,
          piece.tonalidadComposicion,
          instrumentId,
        ),
      })),
    [events, instrumentId, piece.tonalidadComposicion],
  );

  const rows = useMemo(
    () => buildMelodicTimelineRows(resolvedEvents, octaveExact, instrumentId),
    [instrumentId, resolvedEvents, octaveExact],
  );

  const melodicRowDrag = useMemo(
    () => ({
      rows,
      octaveExact,
      events: resolvedEvents,
      tonalidadComposicion: piece.tonalidadComposicion,
    }),
    [resolvedEvents, octaveExact, piece.tonalidadComposicion, rows],
  );

  const eventsByRow = useMemo(() => {
    const grouped = new Map<string, CompositorTrackEvent[]>();

    for (const row of rows) {
      grouped.set(row.id, []);
    }

    for (const event of resolvedEvents) {
      const rowId = getMelodicEventRowId(event, rows, octaveExact);
      const bucket = grouped.get(rowId) ?? [];
      bucket.push(event);
      grouped.set(rowId, bucket);
    }

    return grouped;
  }, [resolvedEvents, octaveExact, rows]);

  const scrollRows = rows.map((row) => ({ id: row.id, label: row.label }));
  const trackWidthPx = gridSteps * COMPOSITOR_TIMELINE_STEP_MIN_PX;

  return (
    <CompositorScrollableTimelineGrid
      piece={piece}
      gridSteps={gridSteps}
      rows={scrollRows}
      playheadProgress={playheadProgress}
      disabled={disabled}
      scrollContainerRef={scrollContainerRef}
      placementPreview={placementPreview}
      onPlacementTap={onPlacementTap}
      onClearSelection={() => onSelectEvent(null)}
      renderRowEvents={(row) => {
        const rowEvents = eventsByRow.get(row.id) ?? [];

        return rowEvents.map((event) =>
          renderTimelineBlock({
            event,
            instrumentId,
            piece,
            gridSteps,
            trackWidthPx,
            selectedEventId,
            disabled,
            showNoteLabel: false,
            highlightEventId,
            melodicRowDrag,
            onSelectEvent,
            onUpdateEvent,
          }),
        );
      }}
    />
  );
}

function DrumTimeline({
  piece,
  events,
  selectedEventId,
  playheadProgress,
  gridSteps,
  disabled,
  highlightEventId,
  scrollContainerRef,
  placementPreview,
  onPlacementTap,
  onSelectEvent,
  onUpdateEvent,
}: {
  piece: CompositorPiece;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  playheadProgress: number | null;
  gridSteps: number;
  disabled: boolean;
  highlightEventId?: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  placementPreview: ReturnType<
    typeof useCompositorPalettePlacement
  >["placementPreview"];
  onPlacementTap: (clientX: number, clientY: number) => boolean;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
}) {
  const rows = buildDrumTimelineRows();
  const eventsByRow = useMemo(() => {
    const grouped = new Map<string, CompositorTrackEvent[]>();

    for (const row of rows) {
      grouped.set(row.id, []);
    }

    for (const event of events) {
      const rowId = getDrumEventRowId(event);
      const bucket = grouped.get(rowId) ?? [];
      bucket.push(event);
      grouped.set(rowId, bucket);
    }

    return grouped;
  }, [events, rows]);

  const scrollRows = rows.map((row) => ({ id: row.id, label: row.label }));
  const trackWidthPx = gridSteps * COMPOSITOR_TIMELINE_STEP_MIN_PX;

  return (
    <CompositorScrollableTimelineGrid
      piece={piece}
      gridSteps={gridSteps}
      rows={scrollRows}
      playheadProgress={playheadProgress}
      disabled={disabled}
      scrollContainerRef={scrollContainerRef}
      placementPreview={placementPreview}
      onPlacementTap={onPlacementTap}
      onClearSelection={() => onSelectEvent(null)}
      renderRowEvents={(row) => {
        const rowEvents = eventsByRow.get(row.id) ?? [];

        return rowEvents.map((event) =>
          renderTimelineBlock({
            event,
            instrumentId: "bateria",
            piece,
            gridSteps,
            trackWidthPx,
            selectedEventId,
            disabled,
            showNoteLabel: false,
            highlightEventId,
            onSelectEvent,
            onUpdateEvent,
          }),
        );
      }}
    />
  );
}

export function CompositorTrackTimeline({
  piece,
  instrumentId,
  events,
  selectedEventId,
  cycleProgress,
  octaveExact,
  disabled = false,
  trackAtCapacity = false,
  isPreviewingTrack = false,
  previewDisabled = false,
  onSelectEvent,
  onUpdateEvent,
  onPlaceEvent,
  onRemoveEvent,
  onSelectTrack,
  onPreviewTrack,
  capasMode = "all",
  placementMode = null,
  tonalidadComposicion,
  modoTonalComposicion,
  onSetTonalidadComposicion,
  onSetModoTonalComposicion,
  highlightEventId = null,
  layout = "default",
  capacityLabel,
  configHeaderTrailing,
}: CompositorTrackTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridSteps = getCompositorGridSteps(piece);
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const playheadProgress =
    cycleProgress == null
      ? null
      : Math.max(0, Math.min(1, cycleProgress));

  const hasSelectedEvent = selectedEventId != null;
  const canRemoveSelected = hasSelectedEvent && !disabled;
  const showCapasTabs = onSelectTrack && capasMode !== "none";
  const isMelodic = compositorHasContenidoTab(instrumentId);
  const usesPalette = placementMode != null && onPlaceEvent != null;

  const resolvedMelodicEvents = useMemo(
    () =>
      isMelodic
        ? events.map((event) => ({
            ...event,
            note: resolveEventMelodicNote(
              event,
              piece.tonalidadComposicion,
              instrumentId,
            ),
          }))
        : [],
    [events, instrumentId, isMelodic, piece.tonalidadComposicion],
  );

  const melodicRows = useMemo(
    () =>
      isMelodic
        ? buildMelodicTimelineRows(resolvedMelodicEvents, octaveExact, instrumentId)
        : [],
    [isMelodic, instrumentId, octaveExact, resolvedMelodicEvents],
  );

  const visibleMelodicOctaves = useMemo(
    () => (isMelodic ? getVisibleMelodicOctaves(instrumentId) : []),
    [instrumentId, isMelodic],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const [melodicDraft, setMelodicDraft] = useState<CompositorMelodicDraft>(() =>
    createDefaultMelodicDraft(instrumentId),
  );

  const [drumDraft, setDrumDraft] = useState<CompositorDrumDraft>(() =>
    createDefaultDrumDraft(),
  );

  const configMode = selectedEvent ? "edit" : "create";

  const clearBlockSelection = useCallback(() => {
    onSelectEvent(null);
  }, [onSelectEvent]);

  useEffect(() => {
    if (!usesPalette || disabled || selectedEventId == null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;

      if (target.closest("[data-compositor-timeline-block]")) {
        return;
      }

      if (target.closest("[data-compositor-edit-surface]")) {
        return;
      }

      clearBlockSelection();
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [clearBlockSelection, disabled, selectedEventId, usesPalette]);

  useEffect(() => {
    if (placementMode !== "melodic") {
      return;
    }

    if (!visibleMelodicOctaves.includes(melodicDraft.octavaRelativa)) {
      setMelodicDraft((current) => ({
        ...current,
        octavaRelativa: visibleMelodicOctaves[0] ?? current.octavaRelativa,
      }));
    }
  }, [melodicDraft.octavaRelativa, placementMode, visibleMelodicOctaves]);

  useEffect(() => {
    if (placementMode !== "melodic") {
      return;
    }

    if (!selectedEventId) {
      setMelodicDraft(createDefaultMelodicDraft(instrumentId));
      return;
    }

    const event = events.find((entry) => entry.id === selectedEventId);

    if (event) {
      setMelodicDraft(draftFromEvent(event, instrumentId));
    }
  }, [events, instrumentId, placementMode, selectedEventId]);

  useEffect(() => {
    if (placementMode !== "drum") {
      return;
    }

    if (!selectedEventId) {
      setDrumDraft(createDefaultDrumDraft());
      return;
    }

    const event = events.find((entry) => entry.id === selectedEventId);

    if (event) {
      setDrumDraft(drumDraftFromEvent(event));
    }
  }, [events, placementMode, selectedEventId]);

  const palettePlacement = useCompositorPalettePlacement({
    disabled: disabled || !usesPalette || trackAtCapacity,
    gridSteps,
    instrumentId,
    tonalidadComposicion: piece.tonalidadComposicion,
    subdivisionsPerGolpe: piece.subdivisionsPerGolpe,
    octaveExact,
    melodicRows,
    melodicDraft,
    drumDraft,
    onPlaceEvent: onPlaceEvent ?? (() => null),
  });

  function handleMelodicDraftChange(nextDraft: CompositorMelodicDraft) {
    setMelodicDraft(nextDraft);

    if (selectedEvent && placementMode === "melodic") {
      onUpdateEvent(
        selectedEvent.id,
        draftToEventPatch(
          nextDraft,
          instrumentId,
          piece.tonalidadComposicion,
          nextDraft.octavaRelativa,
        ),
      );
    }
  }

  const handleAddMelodicBlock = useCallback(() => {
    if (!onPlaceEvent || disabled || trackAtCapacity) {
      return;
    }

    const partial = buildMelodicAddPartial(
      melodicDraft,
      events,
      instrumentId,
      piece.tonalidadComposicion,
      piece.subdivisionsPerGolpe,
      gridSteps,
    );
    const rowId = getMelodicRowIdForDraft(
      melodicDraft,
      instrumentId,
      piece.tonalidadComposicion,
    );

    if (!partial || !rowId) {
      onPlaceEvent(
        {
          startStep: gridSteps,
          durationSteps: Math.max(1, piece.subdivisionsPerGolpe),
        },
        {
          rowId: rowId ?? melodicRows[0]?.id ?? "pitch-0-3",
          octaveExact,
          selectOnPlace: false,
        },
      );
      return;
    }

    onPlaceEvent(partial, {
      rowId,
      octaveExact,
      selectOnPlace: false,
    });
  }, [
    disabled,
    events,
    gridSteps,
    instrumentId,
    melodicDraft,
    melodicRows,
    octaveExact,
    onPlaceEvent,
    piece.subdivisionsPerGolpe,
    piece.tonalidadComposicion,
    trackAtCapacity,
  ]);

  function handleDrumDraftChange(nextDraft: CompositorDrumDraft) {
    setDrumDraft(nextDraft);

    if (selectedEvent && placementMode === "drum") {
      onUpdateEvent(selectedEvent.id, drumDraftToEventPatch(nextDraft));
    }
  }

  const timelineCommonProps = {
    disabled,
    highlightEventId,
    scrollContainerRef,
    placementPreview: usesPalette ? palettePlacement.placementPreview : null,
    onPlacementTap: usesPalette
      ? palettePlacement.handleTimelineTapPlace
      : () => false,
    playheadProgress,
    gridSteps,
    onSelectEvent,
    onUpdateEvent,
  };

  function handleRemoveSelected() {
    if (selectedEventId) {
      onRemoveEvent(selectedEventId);
    }
  }

  const removeSelectedButton = hasSelectedEvent ? (
    <TapButton
      type="button"
      disabled={!canRemoveSelected}
      onClick={handleRemoveSelected}
      data-compositor-edit-surface=""
      className="flex shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,#e85d4a_32%,var(--border))] bg-[color-mix(in_srgb,#e85d4a_10%,var(--bg-dark))] p-1.5 text-[#e85d4a] disabled:opacity-40"
      aria-label="Eliminar bloque seleccionado"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </TapButton>
  ) : null;

  const timelineHeader = placementMode === null ? (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
        Línea de tiempo · {getInstrumentLabel(instrumentId)}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-[10px] text-text-muted">~{cycleSeconds.toFixed(1)} s</p>
        {removeSelectedButton}
      </div>
    </div>
  ) : (
    <div className="mb-1 flex items-center justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
        {getInstrumentLabel(instrumentId)} · ~{cycleSeconds.toFixed(1)} s
      </p>
      {removeSelectedButton}
    </div>
  );

  const editSection = (
    <>
      {placementMode === "drum" ? (
        <div className="mb-2 space-y-2">
          <CompositorDrumEditPanel
            draft={drumDraft}
            mode={configMode}
            disabled={disabled || (configMode === "create" && !!trackAtCapacity)}
            onDraftChange={handleDrumDraftChange}
            onExitEdit={() => onSelectEvent(null)}
            onPointerDownDrag={palettePlacement.handlePointerDownDrumDrag}
          />
        </div>
      ) : null}

      {placementMode === "melodic" ? (
        <div className="mb-2 space-y-2">
          {onSetTonalidadComposicion && onSetModoTonalComposicion ? (
            <div className="flex flex-wrap items-center gap-2">
              <CompositorTonalidadSelect
                tonalidadComposicion={
                  tonalidadComposicion ?? piece.tonalidadComposicion
                }
                modoTonalComposicion={
                  modoTonalComposicion ?? piece.modoTonalComposicion
                }
                disabled={disabled}
                showLabel
                onTonalidadChange={onSetTonalidadComposicion}
                onModoTonalChange={onSetModoTonalComposicion}
              />
              {showCapasTabs && onSelectTrack ? (
                <CompositorMelodicInstrumentSelect
                  activeTrackId={instrumentId as CompositorMelodicInstrumentId}
                  disabled={disabled}
                  showLabel
                  onInstrumentChange={onSelectTrack}
                />
              ) : null}
              {layout === "desktop" && capacityLabel ? (
                <p className="ml-auto shrink-0 text-[11px] text-text-muted">
                  {capacityLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          <CompositorMelodicConfigPanel
            instrumentId={instrumentId}
            tonalidadComposicion={piece.tonalidadComposicion}
            modoTonalComposicion={piece.modoTonalComposicion}
            draft={melodicDraft}
            visibleOctaves={visibleMelodicOctaves}
            mode={configMode}
            disabled={disabled || trackAtCapacity}
            onDraftChange={handleMelodicDraftChange}
            onExitEdit={() => onSelectEvent(null)}
            onAddBlock={handleAddMelodicBlock}
          />
        </div>
      ) : null}

      {showCapasTabs && placementMode !== "melodic" ? (
        <CompositorCapasTabs
          activeTrackId={instrumentId}
          disabled={disabled}
          onSelectTrack={onSelectTrack}
        />
      ) : null}

      <div className={showCapasTabs && placementMode !== "melodic" ? "mt-2" : ""}>
        {timelineHeader}
        {isMelodic ? (
          <MelodicTimeline
            piece={piece}
            instrumentId={instrumentId}
            events={events}
            selectedEventId={selectedEventId}
            octaveExact={octaveExact}
            {...timelineCommonProps}
          />
        ) : (
          <DrumTimeline
            piece={piece}
            events={events}
            selectedEventId={selectedEventId}
            {...timelineCommonProps}
          />
        )}
      </div>
    </>
  );

  const previewSection = usesPalette ? (
    <div className="flex items-center gap-2">
      <CompositorTimelineMinimap
        className="min-w-0 flex-1"
        scrollContainerRef={scrollContainerRef}
        instrumentId={instrumentId}
        events={events}
        gridSteps={gridSteps}
        tonalidadComposicion={piece.tonalidadComposicion}
        octaveExact={octaveExact}
        playheadProgress={playheadProgress}
      />
      {onPreviewTrack ? (
        <PlayCircleButton
          size="sm"
          isPlaying={isPreviewingTrack}
          onClick={onPreviewTrack}
          disabled={previewDisabled}
          playAriaLabel={`${COMPOSITOR_LABEL_ESCUCHAR_CAPA} · ${getInstrumentLabel(instrumentId)}`}
          stopAriaLabel={`Detener previsualización de ${getInstrumentLabel(instrumentId)}`}
        />
      ) : null}
    </div>
  ) : null;

  const showDesktopCapacityInHeader =
    layout === "desktop" &&
    capacityLabel != null &&
    placementMode !== "melodic";

  const configHeaderRow =
    layout === "desktop" &&
    (showDesktopCapacityInHeader || configHeaderTrailing) ? (
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {configHeaderTrailing ? (
          <div className="shrink-0">{configHeaderTrailing}</div>
        ) : (
          <span aria-hidden="true" />
        )}
        {showDesktopCapacityInHeader ? (
          <p className="ml-auto shrink-0 text-[11px] text-text-muted">
            {capacityLabel}
          </p>
        ) : null}
      </div>
    ) : null;

  if (usesPalette && layout === "desktop") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {previewSection ? (
          <div className="shrink-0 rounded-[10px] border border-border/50 bg-bg-darker/70 px-2 py-2">
            {previewSection}
          </div>
        ) : null}
        <div
          data-tool-vertical-scroll=""
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y"
        >
          <div className="rounded-[10px] border border-border bg-bg-card px-2 py-3">
            {configHeaderRow}
            {editSection}
          </div>
        </div>
      </div>
    );
  }

  if (usesPalette) {
    return (
      <div className="space-y-2">
        <div className="rounded-[10px] border border-border bg-bg-card px-2 py-3">
          {editSection}
        </div>
        <div className="rounded-[10px] border border-border/50 bg-bg-darker/70 px-2 py-2">
          {previewSection}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-2 py-3">
      {editSection}
      {onPreviewTrack ? (
        <div className="mt-2 flex justify-center">
          <PlayCircleButton
            size="sm"
            isPlaying={isPreviewingTrack}
            onClick={onPreviewTrack}
            disabled={previewDisabled}
            playAriaLabel={`${COMPOSITOR_LABEL_ESCUCHAR_CAPA} · ${getInstrumentLabel(instrumentId)}`}
            stopAriaLabel={`Detener previsualización de ${getInstrumentLabel(instrumentId)}`}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CompositorMultiTrackTimeline({
  piece,
  selectedEventId,
  activeTrackId,
  cycleProgress,
  octaveExact,
  togglesDisabled = false,
  onlyCycleLayers = false,
  listenMutedTrackIds = [],
  onToggleTrack,
}: {
  piece: CompositorPiece;
  selectedEventId: string | null;
  activeTrackId: CompositorInstrumentId;
  cycleProgress: number | null;
  octaveExact: boolean;
  togglesDisabled?: boolean;
  onlyCycleLayers?: boolean;
  listenMutedTrackIds?: readonly CompositorInstrumentId[];
  onToggleTrack?: (
    instrumentId: CompositorInstrumentId,
    enabled: boolean,
  ) => void;
}) {
  const gridSteps = getCompositorGridSteps(piece);
  const playheadProgress =
    cycleProgress == null
      ? null
      : Math.max(0, Math.min(1, cycleProgress));
  const mutedTrackIds = new Set(listenMutedTrackIds);
  const visibleTracks = onlyCycleLayers
    ? piece.tracks.filter(isCompositorCycleLayer)
    : piece.tracks;

  return (
    <div
      className={`space-y-2.5 transition-opacity ${
        togglesDisabled ? "opacity-[0.72]" : ""
      }`}
    >
      {visibleTracks.map((track) => {
          const isMelodic = compositorHasContenidoTab(track.instrumentId);
          const melodicRows = isMelodic
            ? buildMelodicTimelineRows(
                track.events,
                octaveExact,
                track.instrumentId,
              )
            : buildDrumTimelineRows();
          const rowCount = Math.max(1, melodicRows.length);
          const heightPx = Math.min(96, Math.max(32, rowCount * 10));
          const isEnabled = !mutedTrackIds.has(track.instrumentId);

          return (
            <div
              key={track.instrumentId}
              className="rounded-[10px] border border-border bg-bg-card px-3 py-2.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p
                  className={`min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide ${
                    isEnabled ? "text-text-primary" : "text-text-muted"
                  }`}
                >
                  {getInstrumentLabel(track.instrumentId)}
                </p>
                {onToggleTrack ? (
                  <TapButton
                    type="button"
                    disabled={togglesDisabled}
                    onClick={() => onToggleTrack(track.instrumentId, !isEnabled)}
                    aria-label={`${isEnabled ? "Silenciar" : "Activar"} ${getInstrumentLabel(track.instrumentId)}`}
                    aria-pressed={isEnabled}
                    className={`shrink-0 rounded-full p-0.5 transition-opacity ${
                      togglesDisabled
                        ? "cursor-not-allowed"
                        : "active:opacity-80"
                    }`}
                  >
                    <CompositorCapaInlineToggle isOn={isEnabled} size="sm" />
                  </TapButton>
                ) : null}
              </div>
              <div
                className={`relative overflow-hidden rounded-md border border-border/80 bg-bg-darker transition-opacity ${
                  isEnabled ? "" : "opacity-35"
                }`}
                style={{ height: `${heightPx}px` }}
              >
                <div className="absolute inset-0 flex">
                  {Array.from({ length: gridSteps }, (_, step) => (
                    <div
                      key={step}
                      className="min-w-0 flex-1 border-r border-border/20"
                    />
                  ))}
                </div>
                {track.events.map((event) => {
                  const leftPercent = (event.startStep / gridSteps) * 100;
                  const widthPercent = (event.durationSteps / gridSteps) * 100;
                  const isActiveLayer =
                    track.instrumentId === activeTrackId &&
                    (selectedEventId == null || selectedEventId === event.id);

                  let topPercent = 0;
                  let rowHeightPercent = 100;

                  if (isMelodic) {
                    const rows = buildMelodicTimelineRows(
                      track.events,
                      octaveExact,
                      track.instrumentId,
                    );
                    const rowId = getMelodicEventRowId(event, rows, octaveExact);
                    const rowIndex = rows.findIndex((row) => row.id === rowId);
                    const safeIndex = rowIndex === -1 ? 0 : rowIndex;
                    rowHeightPercent = 100 / rowCount;
                    topPercent = safeIndex * rowHeightPercent;
                  } else {
                    const rows = buildDrumTimelineRows();
                    const rowIndex = rows.findIndex(
                      (row) => row.id === getDrumEventRowId(event),
                    );
                    const safeIndex = rowIndex === -1 ? 0 : rowIndex;
                    rowHeightPercent = 100 / rowCount;
                    topPercent = safeIndex * rowHeightPercent;
                  }

                  return (
                    <div
                      key={event.id}
                      className={`absolute ${getCompositorTimelineBlockClassName({
                        instrumentId: track.instrumentId,
                        isSelected: isActiveLayer,
                        guitarArticulation:
                          track.instrumentId === "guitarra"
                            ? event.guitarArticulation
                            : undefined,
                        drumSilencio:
                          track.instrumentId === "bateria" &&
                          event.drumSound === "silencio",
                        mini: true,
                      })} ${isActiveLayer ? "" : "opacity-70"}`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(widthPercent, 100 / gridSteps)}%`,
                        top: `${topPercent}%`,
                        height: `${rowHeightPercent}%`,
                      }}
                    />
                  );
                })}
                {playheadProgress != null && isEnabled ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-tool-practice"
                    style={{
                      left: `${playheadProgress * 100}%`,
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function findEventAtStep(
  events: CompositorTrackEvent[],
  step: number,
): CompositorTrackEvent | null {
  return events.find((event) => eventOverlapsStep(event, step)) ?? null;
}
