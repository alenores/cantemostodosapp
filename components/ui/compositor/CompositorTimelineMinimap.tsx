"use client";

import type { CompositorInstrumentId, CompositorTrackEvent } from "@/lib/compositor";
import { getCompositorTimelineBlockClassName } from "@/lib/compositor-instrument-colors";
import {
  buildDrumTimelineRows,
  buildMelodicTimelineRows,
  getDrumEventRowId,
  getMelodicEventRowId,
} from "@/lib/compositor-timeline-layout";
import { compositorHasContenidoTab } from "@/components/ui/compositor/CompositorSlotDetail";
import { resolveEventMelodicNote } from "@/lib/compositor-melodic-pitch";
import type { NotaIndex } from "@/lib/cifrado";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

type CompositorTimelineMinimapProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  instrumentId: CompositorInstrumentId;
  events: CompositorTrackEvent[];
  gridSteps: number;
  tonalidadComposicion: NotaIndex;
  octaveExact: boolean;
  playheadProgress: number | null;
  className?: string;
};

export function CompositorTimelineMinimap({
  scrollContainerRef,
  instrumentId,
  events,
  gridSteps,
  tonalidadComposicion,
  octaveExact,
  playheadProgress,
  className = "",
}: CompositorTimelineMinimapProps) {
  const [viewport, setViewport] = useState({ left: 0, width: 1 });

  const updateViewport = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    if (scrollWidth <= clientWidth) {
      setViewport({ left: 0, width: 100 });
      return;
    }

    const left = (container.scrollLeft / scrollWidth) * 100;
    const width = (clientWidth / scrollWidth) * 100;
    setViewport({ left, width });
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    updateViewport();

    container.addEventListener("scroll", updateViewport, { passive: true });
    const observer = new ResizeObserver(updateViewport);
    observer.observe(container);

    return () => {
      container.removeEventListener("scroll", updateViewport);
      observer.disconnect();
    };
  }, [scrollContainerRef, updateViewport, gridSteps, events.length]);

  const isMelodic = compositorHasContenidoTab(instrumentId);
  const rows = isMelodic
    ? buildMelodicTimelineRows(
        events.map((event) => ({
          ...event,
          note: resolveEventMelodicNote(
            event,
            tonalidadComposicion,
            instrumentId,
          ),
        })),
        octaveExact,
        instrumentId,
      )
    : buildDrumTimelineRows();
  const rowCount = Math.max(1, rows.length);

  function scrollToRatio(ratio: number) {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollLeft = Math.max(0, Math.min(maxScroll, ratio * maxScroll));
  }

  return (
    <div className={`rounded-md border border-border/80 bg-bg-darker px-1 py-1.5 ${className}`}>
      <p className="mb-1 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
        Vista del ciclo
      </p>
      <button
        type="button"
        className="relative h-10 w-full overflow-hidden rounded bg-bg-card/40"
        aria-label="Navegar por el ciclo completo"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          scrollToRatio(ratio);
        }}
      >
        <div className="absolute inset-0 flex">
          {Array.from({ length: gridSteps }, (_, step) => (
            <div
              key={step}
              className="min-w-0 flex-1 border-r border-border/15"
            />
          ))}
        </div>

        {events.map((event) => {
          const leftPercent = (event.startStep / gridSteps) * 100;
          const widthPercent = (event.durationSteps / gridSteps) * 100;

          let topPercent = 0;
          let rowHeightPercent = 100;

          if (isMelodic) {
            const melodicRows = rows as ReturnType<
              typeof buildMelodicTimelineRows
            >;
            const rowId = getMelodicEventRowId(event, melodicRows, octaveExact);
            const rowIndex = melodicRows.findIndex((row) => row.id === rowId);
            const safeIndex = rowIndex === -1 ? 0 : rowIndex;
            rowHeightPercent = 100 / rowCount;
            topPercent = safeIndex * rowHeightPercent;
          } else {
            const drumRows = rows as ReturnType<typeof buildDrumTimelineRows>;
            const rowIndex = drumRows.findIndex(
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
                instrumentId,
                isSelected: false,
                guitarArticulation:
                  instrumentId === "guitarra"
                    ? event.guitarArticulation
                    : undefined,
                drumSilencio:
                  instrumentId === "bateria" && event.drumSound === "silencio",
                mini: true,
              })}`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 100 / gridSteps)}%`,
                top: `${topPercent}%`,
                height: `${rowHeightPercent}%`,
              }}
            />
          );
        })}

        {playheadProgress != null ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-tool-practice"
            style={{
              left: `${playheadProgress * 100}%`,
            }}
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-y-0 rounded border border-compositor-config/70 bg-compositor-config/10"
          style={{
            left: `${viewport.left}%`,
            width: `${viewport.width}%`,
          }}
        />
      </button>
    </div>
  );
}
