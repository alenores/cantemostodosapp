"use client";

import { CompositorCapasTabs } from "@/components/ui/compositor/CompositorCapasStrip";
import { CompositorTimelineBlock } from "@/components/ui/compositor/CompositorTimelineBlock";
import {
  CompositorScrollableTimelineGrid,
  getTimelineBlockLayout,
} from "@/components/ui/compositor/CompositorScrollableTimelineGrid";
import { compositorHasContenidoTab } from "@/components/ui/compositor/CompositorSlotDetail";
import { TapButton } from "@/components/ui/TapFeedback";
import { CompositorCapaInlineToggle } from "@/components/ui/compositor/CompositorCapaInlineToggle";
import {
  COMPOSITOR_CAPA_TAB_ACTIVE_CLASS,
  getCompositorTimelineBlockClassName,
} from "@/lib/compositor-instrument-colors";
import type {
  CompositorInstrumentId,
  CompositorPiece,
  CompositorTrackEvent,
} from "@/lib/compositor";
import { getInstrumentLabel } from "@/lib/compositor";
import {
  buildDrumTimelineRows,
  buildMelodicTimelineRows,
  COMPOSITOR_TIMELINE_STEP_MIN_PX,
  getDrumEventRowId,
  getMelodicEventRowId,
  type CompositorTimelineEventPatch,
} from "@/lib/compositor-timeline-layout";
import {
  eventOverlapsStep,
  getCompositorCycleDurationSeconds,
  getCompositorGridSteps,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import {
  COMPOSITOR_LABEL_AGREGAR_BLOQUE,
  COMPOSITOR_LABEL_ESCUCHAR_CAPA,
} from "@/lib/ritmo-terminologia";
import { Play, Plus, Square, Trash2 } from "lucide-react";
import { useMemo } from "react";

type CompositorTrackTimelineProps = {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  cycleProgress: number | null;
  octaveExact: boolean;
  disabled?: boolean;
  isPreviewingTrack?: boolean;
  previewDisabled?: boolean;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
  onAddEvent: () => void;
  onRemoveEvent: (eventId: string) => void;
  onSelectTrack?: (instrumentId: CompositorInstrumentId) => void;
  onPreviewTrack?: () => void;
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
  melodicRowDrag?: {
    rows: ReturnType<typeof buildMelodicTimelineRows>;
    octaveExact: boolean;
    events: CompositorTrackEvent[];
  };
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
  playheadStep,
  gridSteps,
  octaveExact,
  disabled,
  onSelectEvent,
  onUpdateEvent,
}: {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  playheadStep: number | null;
  gridSteps: number;
  octaveExact: boolean;
  disabled: boolean;
  onSelectEvent: (eventId: string | null) => void;
  onUpdateEvent: (
    eventId: string,
    patch: CompositorTimelineEventPatch,
  ) => void;
}) {
  const rows = useMemo(
    () => buildMelodicTimelineRows(events, octaveExact),
    [events, octaveExact],
  );

  const melodicRowDrag = useMemo(
    () => ({ rows, octaveExact, events }),
    [events, octaveExact, rows],
  );

  const eventsByRow = useMemo(() => {
    const grouped = new Map<string, CompositorTrackEvent[]>();

    for (const row of rows) {
      grouped.set(row.id, []);
    }

    for (const event of events) {
      const rowId = getMelodicEventRowId(event, rows, octaveExact);
      const bucket = grouped.get(rowId) ?? [];
      bucket.push(event);
      grouped.set(rowId, bucket);
    }

    return grouped;
  }, [events, octaveExact, rows]);

  const scrollRows = rows.map((row) => ({ id: row.id, label: row.label }));
  const trackWidthPx = gridSteps * COMPOSITOR_TIMELINE_STEP_MIN_PX;
  const rowKindById = new Map(rows.map((row) => [row.id, row.kind]));

  return (
    <CompositorScrollableTimelineGrid
      piece={piece}
      gridSteps={gridSteps}
      rows={scrollRows}
      playheadStep={playheadStep}
      disabled={disabled}
      onClearSelection={() => onSelectEvent(null)}
      renderRowEvents={(row) => {
        const rowEvents = eventsByRow.get(row.id) ?? [];
        const rowKind = rowKindById.get(row.id);

        return rowEvents.map((event) =>
          renderTimelineBlock({
            event,
            instrumentId,
            piece,
            gridSteps,
            trackWidthPx,
            selectedEventId,
            disabled,
            showNoteLabel: rowKind === "overflow",
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
  playheadStep,
  gridSteps,
  disabled,
  onSelectEvent,
  onUpdateEvent,
}: {
  piece: CompositorPiece;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  playheadStep: number | null;
  gridSteps: number;
  disabled: boolean;
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
      playheadStep={playheadStep}
      disabled={disabled}
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
  isPreviewingTrack = false,
  previewDisabled = false,
  onSelectEvent,
  onUpdateEvent,
  onAddEvent,
  onRemoveEvent,
  onSelectTrack,
  onPreviewTrack,
}: CompositorTrackTimelineProps) {
  const gridSteps = getCompositorGridSteps(piece);
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const playheadStep =
    cycleProgress == null
      ? null
      : Math.min(gridSteps - 1, Math.floor(cycleProgress * gridSteps));

  const canRemoveSelected = selectedEventId != null && !disabled;

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-2 py-3">
      {onSelectTrack ? (
        <CompositorCapasTabs
          activeTrackId={instrumentId}
          disabled={disabled}
          onSelectTrack={onSelectTrack}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
            Línea de tiempo · {getInstrumentLabel(instrumentId)}
          </p>
          <p className="text-[10px] text-text-muted">~{cycleSeconds.toFixed(1)} s</p>
        </div>
      )}

      <div className={onSelectTrack ? "mt-2" : ""}>
        {compositorHasContenidoTab(instrumentId) ? (
          <MelodicTimeline
            piece={piece}
            instrumentId={instrumentId}
            events={events}
            selectedEventId={selectedEventId}
            playheadStep={playheadStep}
            gridSteps={gridSteps}
            octaveExact={octaveExact}
            disabled={disabled}
            onSelectEvent={onSelectEvent}
            onUpdateEvent={onUpdateEvent}
          />
        ) : (
          <DrumTimeline
            piece={piece}
            events={events}
            selectedEventId={selectedEventId}
            playheadStep={playheadStep}
            gridSteps={gridSteps}
            disabled={disabled}
            onSelectEvent={onSelectEvent}
            onUpdateEvent={onUpdateEvent}
          />
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <TapButton
          type="button"
          disabled={disabled}
          onClick={onAddEvent}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-bg-dark py-2 text-xs font-bold text-text-primary disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {COMPOSITOR_LABEL_AGREGAR_BLOQUE}
        </TapButton>
        <TapButton
          type="button"
          disabled={!canRemoveSelected}
          onClick={() => {
            if (selectedEventId) {
              onRemoveEvent(selectedEventId);
            }
          }}
          className={`flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40 ${
            canRemoveSelected
              ? "border-[color-mix(in_srgb,#e85d4a_32%,var(--border))] bg-[color-mix(in_srgb,#e85d4a_10%,var(--bg-dark))] text-[#e85d4a]"
              : "border-border bg-bg-dark text-text-muted"
          }`}
          aria-label="Eliminar bloque seleccionado"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </TapButton>
      </div>

      {onPreviewTrack ? (
        <TapButton
          type="button"
          disabled={previewDisabled}
          onClick={onPreviewTrack}
          aria-label={
            isPreviewingTrack
              ? `Detener previsualización de ${getInstrumentLabel(instrumentId)}`
              : `${COMPOSITOR_LABEL_ESCUCHAR_CAPA} · ${getInstrumentLabel(instrumentId)}`
          }
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 py-2 text-xs font-bold disabled:opacity-50 ${
            isPreviewingTrack
              ? "bg-bg-cola-sheet text-text-primary"
              : COMPOSITOR_CAPA_TAB_ACTIVE_CLASS[instrumentId]
          }`}
        >
          {isPreviewingTrack ? (
            <Square className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5" aria-hidden="true" />
          )}
          {isPreviewingTrack ? "Detener" : COMPOSITOR_LABEL_ESCUCHAR_CAPA}
        </TapButton>
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
  onToggleTrack,
}: {
  piece: CompositorPiece;
  selectedEventId: string | null;
  activeTrackId: CompositorInstrumentId;
  cycleProgress: number | null;
  octaveExact: boolean;
  togglesDisabled?: boolean;
  onToggleTrack?: (
    instrumentId: CompositorInstrumentId,
    enabled: boolean,
  ) => void;
}) {
  const gridSteps = getCompositorGridSteps(piece);
  const playheadStep =
    cycleProgress == null
      ? null
      : Math.min(gridSteps - 1, Math.floor(cycleProgress * gridSteps));

  return (
    <div
      className={`space-y-2.5 transition-opacity ${
        togglesDisabled ? "opacity-[0.72]" : ""
      }`}
    >
      {piece.tracks.map((track) => {
          const isMelodic = compositorHasContenidoTab(track.instrumentId);
          const melodicRows = isMelodic
            ? buildMelodicTimelineRows(track.events, octaveExact)
            : buildDrumTimelineRows();
          const rowCount = Math.max(1, melodicRows.length);
          const heightPx = Math.min(96, Math.max(32, rowCount * 10));
          const isEnabled = track.enabled;

          return (
            <div key={track.instrumentId}>
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
                    const rows = buildMelodicTimelineRows(track.events, octaveExact);
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
                {playheadStep != null && isEnabled ? (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-tool-practice"
                    style={{
                      left: `${((playheadStep + 0.5) / gridSteps) * 100}%`,
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
