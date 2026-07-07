"use client";

import { CompositorTonalidadSelect } from "@/components/ui/compositor/CompositorTonalidadSelect";
import { CompositorMultiTrackTimeline } from "@/components/ui/compositor/CompositorTrackTimeline";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { CompositorInstrumentId, CompositorPiece } from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";
import { BPM_MAX, BPM_MIN } from "@/lib/metronomo";

type CompositorListenViewProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventId: string | null;
  bpm: number;
  tonalidadComposicion: NotaIndex;
  isPlaying: boolean;
  cycleProgress: number | null;
  embedded?: boolean;
  onSetBpm: (value: number) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onStart: () => void;
  onStop: () => void;
};

export function CompositorListenView({
  piece,
  activeTrackId,
  selectedEventId,
  bpm,
  tonalidadComposicion,
  isPlaying,
  cycleProgress,
  embedded = false,
  onSetBpm,
  onSetTonalidadComposicion,
  onToggleTrack,
  onStart,
  onStop,
}: CompositorListenViewProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    const desktopContent = (
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[260px] shrink-0 flex-col gap-4 border-r border-border/80 px-4 py-4">
            <div className="flex items-center gap-4">
              <div>
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

              <CompositorTonalidadSelect
                tonalidadComposicion={tonalidadComposicion}
                disabled={isPlaying}
                showLabel
                onTonalidadChange={onSetTonalidadComposicion}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <CompositorMultiTrackTimeline
                piece={piece}
                selectedEventId={selectedEventId}
                activeTrackId={activeTrackId}
                cycleProgress={isPlaying ? cycleProgress : null}
                octaveExact={true}
                togglesDisabled={isPlaying}
                onToggleTrack={onToggleTrack}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
            <PlayCircleButton
              isPlaying={isPlaying}
              onClick={isPlaying ? onStop : () => void onStart()}
              playAriaLabel="Reproducir composición"
              stopAriaLabel="Detener reproducción"
            />
          </div>
        </div>
    );

    if (embedded) {
      return desktopContent;
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border bg-bg-card">
        {desktopContent}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-[var(--tool-practice-section-bg)] px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="space-y-3">
        <CompositorMultiTrackTimeline
          piece={piece}
          selectedEventId={selectedEventId}
          activeTrackId={activeTrackId}
          cycleProgress={isPlaying ? cycleProgress : null}
          octaveExact={true}
          togglesDisabled={isPlaying}
          onToggleTrack={onToggleTrack}
        />

        <div className="flex justify-center">
          <PlayCircleButton
            isPlaying={isPlaying}
            onClick={isPlaying ? onStop : onStart}
            playAriaLabel="Reproducir composición"
            stopAriaLabel="Detener reproducción"
          />
        </div>
      </div>
    </div>
  );
}
