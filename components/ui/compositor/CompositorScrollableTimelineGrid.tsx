"use client";

import type { CompositorPiece } from "@/lib/compositor";
import {
  COMPOSITOR_TIMELINE_ROW_LABEL_WIDTH_PX,
  COMPOSITOR_TIMELINE_RULER_HEIGHT_PX,
  COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  COMPOSITOR_TIMELINE_STEP_MIN_PX,
} from "@/lib/compositor-timeline-layout";
import type { CompositorTimelineDropCell } from "@/lib/compositor-timeline-placement";
import { forwardVerticalWheel } from "@/lib/forward-vertical-wheel";
import type { ReactNode, RefObject } from "react";
import { useRef, useState } from "react";

const ROW_HEIGHT_CLASS = "h-8";
const RULER_HEIGHT_CLASS = "h-5";
const MARQUEE_THRESHOLD_PX = 4;

function TimelineGridBackground({
  gridSteps,
  subdivisionsPerGolpe,
  trackWidthPx,
}: {
  gridSteps: number;
  subdivisionsPerGolpe: number;
  trackWidthPx: number;
}) {
  return (
    <div
      className="absolute inset-0 flex"
      style={{ width: `${trackWidthPx}px` }}
    >
      {Array.from({ length: gridSteps }, (_, step) => (
        <div
          key={step}
          style={{ width: `${COMPOSITOR_TIMELINE_STEP_MIN_PX}px` }}
          className={`shrink-0 border-r border-border/30 ${
            step % subdivisionsPerGolpe === 0 ? "bg-bg-card/20" : ""
          }`}
        />
      ))}
    </div>
  );
}

function TimelineStepRuler({
  gridSteps,
  subdivisionsPerGolpe,
  trackWidthPx,
}: {
  gridSteps: number;
  subdivisionsPerGolpe: number;
  trackWidthPx: number;
}) {
  return (
    <div
      className="flex shrink-0 border-b border-border/40 bg-bg-dark/40"
      style={{ width: `${trackWidthPx}px`, height: RULER_HEIGHT_CLASS }}
    >
      {Array.from({ length: gridSteps }, (_, step) => {
        const isGolpeStart = step % subdivisionsPerGolpe === 0;

        return (
          <div
            key={step}
            style={{ width: `${COMPOSITOR_TIMELINE_STEP_MIN_PX}px` }}
            className={`flex shrink-0 items-center justify-center border-r border-border/20 text-[8px] leading-none ${
              isGolpeStart
                ? "font-bold text-text-muted"
                : "font-medium text-text-muted/70"
            }`}
          >
            {step + 1}
          </div>
        );
      })}
    </div>
  );
}

function Playhead({
  playheadProgress,
  gridSteps,
}: {
  playheadProgress: number;
  gridSteps: number;
}) {
  const leftPx =
    playheadProgress * gridSteps * COMPOSITOR_TIMELINE_STEP_MIN_PX;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-tool-practice"
      style={{ left: `${leftPx}px` }}
    />
  );
}

function StickyRowLabels({
  rows,
}: {
  rows: CompositorScrollableTimelineRow[];
}) {
  return (
    <div
      className="sticky left-0 z-30 shrink-0 border-r border-border/50 bg-bg-darker"
      style={{ width: `${COMPOSITOR_TIMELINE_ROW_LABEL_WIDTH_PX}px` }}
    >
      <div
        className={`${RULER_HEIGHT_CLASS} shrink-0 border-b border-border/40 bg-bg-dark/40`}
        aria-hidden="true"
      />
      {rows.map((row) => (
        <div
          key={row.id}
          className={`flex ${ROW_HEIGHT_CLASS} items-center justify-end border-b border-border/20 pr-0.5 text-[7px] font-bold leading-none text-text-muted last:border-b-0`}
        >
          <span className="max-w-full truncate">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export type CompositorScrollableTimelineRow = {
  id: string;
  label: string;
};

export function CompositorScrollableTimelineGrid({
  piece,
  gridSteps,
  rows,
  playheadProgress,
  renderRowEvents,
  trackOverlay = null,
  disabled = false,
  onClearSelection,
  onMarqueeSelect,
  scrollContainerRef,
  placementPreview = null,
}: {
  piece: CompositorPiece;
  gridSteps: number;
  rows: CompositorScrollableTimelineRow[];
  playheadProgress: number | null;
  renderRowEvents: (row: CompositorScrollableTimelineRow) => ReactNode;
  trackOverlay?: ReactNode;
  disabled?: boolean;
  onClearSelection?: () => void;
  onMarqueeSelect?: (bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  placementPreview?: CompositorTimelineDropCell | null;
}) {
  const trackWidthPx = gridSteps * COMPOSITOR_TIMELINE_STEP_MIN_PX;
  const contentWidthPx =
    COMPOSITOR_TIMELINE_ROW_LABEL_WIDTH_PX + trackWidthPx;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const marqueeOriginRef = useRef<{
    clientX: number;
    clientY: number;
    pointerId: number;
  } | null>(null);

  const handleBackgroundPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (disabled) {
      return;
    }

    if (
      (event.target as HTMLElement).closest("[data-compositor-timeline-block]")
    ) {
      return;
    }

    if (!onMarqueeSelect) {
      onClearSelection?.();
      return;
    }

    event.preventDefault();
    marqueeOriginRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
    };
    setMarquee(null);

    const onMove = (moveEvent: PointerEvent) => {
      const origin = marqueeOriginRef.current;

      if (!origin || moveEvent.pointerId !== origin.pointerId) {
        return;
      }

      const left = Math.min(origin.clientX, moveEvent.clientX);
      const top = Math.min(origin.clientY, moveEvent.clientY);
      const width = Math.abs(moveEvent.clientX - origin.clientX);
      const height = Math.abs(moveEvent.clientY - origin.clientY);

      if (width < MARQUEE_THRESHOLD_PX && height < MARQUEE_THRESHOLD_PX) {
        setMarquee(null);
        return;
      }

      setMarquee({ left, top, width, height });
    };

    const onUp = (upEvent: PointerEvent) => {
      const origin = marqueeOriginRef.current;

      if (!origin || upEvent.pointerId !== origin.pointerId) {
        return;
      }

      const left = Math.min(origin.clientX, upEvent.clientX);
      const top = Math.min(origin.clientY, upEvent.clientY);
      const right = Math.max(origin.clientX, upEvent.clientX);
      const bottom = Math.max(origin.clientY, upEvent.clientY);
      const width = right - left;
      const height = bottom - top;

      marqueeOriginRef.current = null;
      setMarquee(null);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);

      if (width < MARQUEE_THRESHOLD_PX && height < MARQUEE_THRESHOLD_PX) {
        onClearSelection?.();
        return;
      }

      onMarqueeSelect({ left, top, right, bottom });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  const previewLeftPercent =
    placementPreview == null
      ? null
      : (placementPreview.step / gridSteps) * 100;
  const previewWidthPercent = (1 / gridSteps) * 100;

  const marqueeStyle =
    marquee == null || trackRef.current == null
      ? null
      : (() => {
          const trackRect = trackRef.current.getBoundingClientRect();
          return {
            left: marquee.left - trackRect.left,
            top: marquee.top - trackRect.top,
            width: marquee.width,
            height: marquee.height,
          };
        })();

  return (
    <div
      ref={scrollContainerRef}
      className="mt-2 min-w-0 touch-pan-x touch-pan-y overflow-x-auto overscroll-x-contain rounded-lg border border-border/80 bg-bg-darker"
      onPointerDown={handleBackgroundPointerDown}
      onWheel={forwardVerticalWheel}
    >
      <div
        className="relative inline-flex min-w-full align-top"
        style={{ width: `${Math.max(contentWidthPx, 0)}px` }}
      >
        <StickyRowLabels rows={rows} />

        <div
          ref={trackRef}
          className="relative min-w-0 shrink-0"
          style={{ width: `${trackWidthPx}px` }}
          data-compositor-timeline-track=""
        >
          <TimelineStepRuler
            gridSteps={gridSteps}
            subdivisionsPerGolpe={piece.subdivisionsPerGolpe}
            trackWidthPx={trackWidthPx}
          />

          {rows.map((row) => (
            <div
              key={row.id}
              data-compositor-timeline-row={row.id}
              className={`relative border-b border-border/20 last:border-b-0 ${ROW_HEIGHT_CLASS}`}
              style={{ width: `${trackWidthPx}px` }}
            >
              <TimelineGridBackground
                gridSteps={gridSteps}
                subdivisionsPerGolpe={piece.subdivisionsPerGolpe}
                trackWidthPx={trackWidthPx}
              />
              {renderRowEvents(row)}
            </div>
          ))}

          {trackOverlay}

          {playheadProgress != null ? (
            <Playhead playheadProgress={playheadProgress} gridSteps={gridSteps} />
          ) : null}

          {marqueeStyle ? (
            <div
              className="pointer-events-none absolute z-40 border border-compositor-config bg-compositor-config/20"
              style={{
                left: `${marqueeStyle.left}px`,
                top: `${marqueeStyle.top}px`,
                width: `${marqueeStyle.width}px`,
                height: `${marqueeStyle.height}px`,
              }}
              aria-hidden="true"
            />
          ) : null}

          {placementPreview &&
          rows.some((row) => row.id === placementPreview.rowId) ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-30 border-2 border-dashed border-compositor-config bg-compositor-config/15"
              style={{
                top: `${
                  rows.findIndex((row) => row.id === placementPreview.rowId) *
                    COMPOSITOR_TIMELINE_ROW_HEIGHT_PX +
                  COMPOSITOR_TIMELINE_RULER_HEIGHT_PX
                }px`,
                height: `${COMPOSITOR_TIMELINE_ROW_HEIGHT_PX}px`,
                left: `${previewLeftPercent}%`,
                width: `${previewWidthPercent}%`,
              }}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function getTimelineBlockLayout(
  startStep: number,
  durationSteps: number,
  gridSteps: number,
  trackWidthPx: number,
) {
  const minBlockWidthPx = COMPOSITOR_TIMELINE_STEP_MIN_PX;

  return {
    leftPercent: (startStep / gridSteps) * 100,
    widthPercent: (durationSteps / gridSteps) * 100,
    minWidthPercent: (minBlockWidthPx / trackWidthPx) * 100,
  };
}
