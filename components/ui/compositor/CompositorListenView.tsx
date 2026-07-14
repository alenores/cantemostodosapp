"use client";

import { CompositorTonalidadSelect } from "@/components/ui/compositor/CompositorTonalidadSelect";
import { CompositorMultiTrackTimeline } from "@/components/ui/compositor/CompositorTrackTimeline";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import type { CompositorInstrumentId, CompositorPiece } from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import { BPM_MAX, BPM_MIN } from "@/lib/metronomo";
import { useEffect } from "react";
const LISTEN_CONTROL_CONTAINER_CLASS =
  "rounded-[10px] border border-border bg-bg-card px-3 py-2.5";

type CompositorListenViewProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventIds: string[];
  bpm: number;
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  isPlaying: boolean;
  cycleProgress: number | null;
  layout?: "compact" | "desktop";
  listenMutedTrackIds?: CompositorInstrumentId[];
  onSetBpm: (value: number) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onSetModoTonalComposicion: (value: ModoTonal) => void;
  onToggleListenTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onEnterListen?: () => void;
  onStart: () => void;
  onStop: () => void;
};

export function CompositorListenView({
  piece,
  activeTrackId,
  selectedEventIds,
  bpm,
  tonalidadComposicion,
  modoTonalComposicion,
  isPlaying,
  cycleProgress,
  layout = "compact",
  listenMutedTrackIds = [],
  onSetBpm,
  onSetTonalidadComposicion,
  onSetModoTonalComposicion,
  onToggleListenTrack,
  onEnterListen,
  onStart,
  onStop,
}: CompositorListenViewProps) {
  useEffect(() => {
    onEnterListen?.();
  }, [onEnterListen]);

  const timelineProps = {
    piece,
    selectedEventIds,
    activeTrackId,
    octaveExact: true as const,
    onlyCycleLayers: true,
    listenMutedTrackIds,
    togglesDisabled: isPlaying,
    onToggleTrack: onToggleListenTrack,
  };
  const playButton = (
    <PlayCircleButton
      size="sm"
      isPlaying={isPlaying}
      onClick={isPlaying ? onStop : () => void onStart()}
      playAriaLabel="Reproducir composición"
      stopAriaLabel="Detener reproducción"
    />
  );

  if (layout === "desktop") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-bg-card">
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex w-full flex-wrap items-center gap-2.5">
            <div className="flex flex-wrap items-stretch gap-2.5">
              <div className={LISTEN_CONTROL_CONTAINER_CLASS}>
                <p className="mb-1 text-[9px] text-text-muted">Tempo</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isPlaying || bpm <= BPM_MIN}
                    onClick={() => onSetBpm(bpm - 1)}
                    aria-label="Reducir tempo"
                    className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-xs font-bold text-text-primary">
                    {bpm}
                  </span>
                  <button
                    type="button"
                    disabled={isPlaying || bpm >= BPM_MAX}
                    onClick={() => onSetBpm(bpm + 1)}
                    aria-label="Aumentar tempo"
                    className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="ml-1 text-[9px] text-text-muted">BPM</span>
                </div>
              </div>

              <div className={LISTEN_CONTROL_CONTAINER_CLASS}>
                <CompositorTonalidadSelect
                  tonalidadComposicion={tonalidadComposicion}
                  modoTonalComposicion={modoTonalComposicion}
                  disabled={isPlaying}
                  showLabel
                  onTonalidadChange={onSetTonalidadComposicion}
                  onModoTonalChange={onSetModoTonalComposicion}
                />
              </div>
            </div>

            <div className="ml-auto shrink-0">{playButton}</div>
          </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <CompositorMultiTrackTimeline
                {...timelineProps}
                cycleProgress={isPlaying ? cycleProgress : null}
              />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-tool-practice/25 bg-[var(--tool-practice-section-bg)] px-3 py-3">
      <div className="mb-3 flex w-full flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap items-stretch gap-2.5">
          <div className={LISTEN_CONTROL_CONTAINER_CLASS}>
            <p className="mb-1 text-[9px] text-text-muted">Tempo</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isPlaying || bpm <= BPM_MIN}
                onClick={() => onSetBpm(bpm - 1)}
                aria-label="Reducir tempo"
                className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
              >
                −
              </button>
              <span className="w-9 text-center text-xs font-bold text-text-primary">
                {bpm}
              </span>
              <button
                type="button"
                disabled={isPlaying || bpm >= BPM_MAX}
                onClick={() => onSetBpm(bpm + 1)}
                aria-label="Aumentar tempo"
                className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
              >
                +
              </button>
              <span className="ml-1 text-[9px] text-text-muted">BPM</span>
            </div>
          </div>

          <div className={LISTEN_CONTROL_CONTAINER_CLASS}>
            <CompositorTonalidadSelect
              tonalidadComposicion={tonalidadComposicion}
              modoTonalComposicion={modoTonalComposicion}
              disabled={isPlaying}
              showLabel
              onTonalidadChange={onSetTonalidadComposicion}
              onModoTonalChange={onSetModoTonalComposicion}
            />
          </div>
        </div>

        <div className="ml-auto shrink-0">{playButton}</div>
      </div>

        <CompositorMultiTrackTimeline
          {...timelineProps}
          cycleProgress={isPlaying ? cycleProgress : null}
        />
    </div>
  );
}
