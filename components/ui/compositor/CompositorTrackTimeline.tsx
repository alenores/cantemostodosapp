"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type {
  CompositorInstrumentId,
  CompositorPiece,
  CompositorTrackEvent,
} from "@/lib/compositor";
import {
  eventOverlapsStep,
  getCompositorCycleDurationSeconds,
  getCompositorGridSteps,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import { getInstrumentLabel } from "@/lib/compositor";
import { Plus, Trash2 } from "lucide-react";

const TRACK_COLORS: Record<CompositorInstrumentId, string> = {
  piano: "bg-compositor-config/80",
  guitarra: "bg-amber-500/80",
  bateria: "bg-orange-600/80",
};

type CompositorTrackTimelineProps = {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  selectedEventId: string | null;
  cycleProgress: number | null;
  disabled?: boolean;
  onSelectEvent: (eventId: string) => void;
  onAddEvent: () => void;
  onRemoveEvent: (eventId: string) => void;
};

export function CompositorTrackTimeline({
  piece,
  instrumentId,
  events,
  selectedEventId,
  cycleProgress,
  disabled = false,
  onSelectEvent,
  onAddEvent,
  onRemoveEvent,
}: CompositorTrackTimelineProps) {
  const gridSteps = getCompositorGridSteps(piece);
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const playheadStep =
    cycleProgress == null
      ? null
      : Math.min(gridSteps - 1, Math.floor(cycleProgress * gridSteps));

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
          Línea de tiempo · {getInstrumentLabel(instrumentId)}
        </p>
        <p className="text-[10px] text-text-muted">~{cycleSeconds.toFixed(1)} s</p>
      </div>

      <div className="relative mt-3 h-14 overflow-hidden rounded-lg border border-border/80 bg-bg-darker">
        <div className="absolute inset-0 flex">
          {Array.from({ length: gridSteps }, (_, step) => (
            <div
              key={step}
              className={`min-w-0 flex-1 border-r border-border/30 ${
                step % piece.subdivisionsPerGolpe === 0 ? "bg-bg-card/20" : ""
              }`}
            />
          ))}
        </div>

        {events.map((event) => {
          const leftPercent = (event.startStep / gridSteps) * 100;
          const widthPercent = (event.durationSteps / gridSteps) * 100;
          const isSelected = selectedEventId === event.id;
          const startSeconds = stepToCycleOffsetSeconds(piece, event.startStep);

          return (
            <button
              key={event.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectEvent(event.id)}
              className={`absolute top-2 bottom-2 rounded-md border px-1 text-[9px] font-bold text-white transition-shadow disabled:opacity-50 ${
                TRACK_COLORS[instrumentId]
              } ${
                isSelected
                  ? "z-10 border-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--compositor-config)_55%,transparent)]"
                  : "border-white/20"
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 100 / gridSteps)}%`,
              }}
              title={`${startSeconds.toFixed(1)} s`}
            >
              <span className="block truncate">
                {instrumentId === "bateria"
                  ? event.drumSound
                  : instrumentId === "guitarra"
                    ? event.guitarArticulation
                    : `${event.note.note}${event.note.octave}`}
              </span>
            </button>
          );
        })}

        {playheadStep != null ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-tool-practice"
            style={{ left: `${((playheadStep + 0.5) / gridSteps) * 100}%` }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex gap-2">
        <TapButton
          type="button"
          disabled={disabled}
          onClick={onAddEvent}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-bg-dark py-2 text-xs font-bold text-text-primary disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar sonido
        </TapButton>
        <TapButton
          type="button"
          disabled={disabled || selectedEventId == null}
          onClick={() => {
            if (selectedEventId) {
              onRemoveEvent(selectedEventId);
            }
          }}
          className="flex items-center justify-center rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs font-bold text-text-muted disabled:opacity-50"
          aria-label="Eliminar sonido seleccionado"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </TapButton>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        Cada bloque es un sonido en esta capa. Pueden superponerse con otras capas
        y durar varios pasos del ciclo.
      </p>
    </div>
  );
}

export function CompositorMultiTrackTimeline({
  piece,
  selectedEventId,
  activeTrackId,
  cycleProgress,
}: {
  piece: CompositorPiece;
  selectedEventId: string | null;
  activeTrackId: CompositorInstrumentId;
  cycleProgress: number | null;
}) {
  const gridSteps = getCompositorGridSteps(piece);
  const playheadStep =
    cycleProgress == null
      ? null
      : Math.min(gridSteps - 1, Math.floor(cycleProgress * gridSteps));

  return (
    <div className="space-y-2">
      {piece.tracks
        .filter((track) => track.enabled)
        .map((track) => (
          <div key={track.instrumentId}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {getInstrumentLabel(track.instrumentId)}
            </p>
            <div className="relative h-8 overflow-hidden rounded-md border border-border/80 bg-bg-darker">
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

                return (
                  <div
                    key={event.id}
                    className={`absolute top-1 bottom-1 rounded-sm ${TRACK_COLORS[track.instrumentId]} ${
                      isActiveLayer ? "opacity-100" : "opacity-70"
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 100 / gridSteps)}%`,
                    }}
                  />
                );
              })}
              {playheadStep != null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-tool-practice"
                  style={{
                    left: `${((playheadStep + 0.5) / gridSteps) * 100}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
    </div>
  );
}

export function findEventAtStep(
  events: CompositorTrackEvent[],
  step: number,
): CompositorTrackEvent | null {
  return events.find((event) => eventOverlapsStep(event, step)) ?? null;
}
