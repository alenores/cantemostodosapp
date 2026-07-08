"use client";

import { CompositorCycleLayerIcons } from "@/components/ui/compositor/CompositorCycleLayerIcons";
import { CompositorListenView } from "@/components/ui/compositor/CompositorListenView";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorInstrumentId, CompositorPiece } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { formatCompositorCycleSummary } from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";
import {
  COMPOSITOR_LABEL_COMPARTIDO_COMUNIDAD,
  COMPOSITOR_LABEL_EDITAR_CICLO,
  COMPOSITOR_LABEL_ESCUCHAR_CICLO,
} from "@/lib/ritmo-terminologia";
import { ChevronDown, Pencil, Play, Square } from "lucide-react";

const CYCLE_CARD_ACTION_BUTTON_CLASS =
  "flex size-7 items-center justify-center rounded-full border border-compositor-config/35 bg-compositor-config/10 text-compositor-config disabled:opacity-40";

type CompositorCycleCardProps = {
  cycle: CompositorCycle;
  controlsDisabled: boolean;
  isExpanded: boolean;
  isPlaybackActive: boolean;
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventId: string | null;
  bpm: number;
  tonalidadComposicion: NotaIndex;
  isPlaying: boolean;
  cycleProgress: number | null;
  listenMutedTrackIds: CompositorInstrumentId[];
  onToggleListen: () => void;
  onEdit: () => void;
  onSetBpm: (value: number) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onToggleListenTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onEnterListen: () => void;
  onStart: () => void;
  onStop: () => void;
};

export function CompositorCycleCard({
  cycle,
  controlsDisabled,
  isExpanded,
  isPlaybackActive,
  piece,
  activeTrackId,
  selectedEventId,
  bpm,
  tonalidadComposicion,
  isPlaying,
  cycleProgress,
  listenMutedTrackIds,
  onToggleListen,
  onEdit,
  onSetBpm,
  onSetTonalidadComposicion,
  onToggleListenTrack,
  onEnterListen,
  onStart,
  onStop,
}: CompositorCycleCardProps) {
  const listenLabel = isExpanded
    ? "Cerrar reproductor"
    : `${COMPOSITOR_LABEL_ESCUCHAR_CICLO} ${cycle.nombre}`;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-[border-color,box-shadow] ${
        isExpanded
          ? "border-tool-practice/40 bg-bg-darker/90 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tool-practice)_12%,transparent)]"
          : "border-border bg-bg-darker/70"
      }`}
    >
      <div className="px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={onToggleListen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-40"
            aria-expanded={isExpanded}
            aria-label={listenLabel}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${
                isExpanded
                  ? "border-tool-practice/35 bg-tool-practice/10 text-tool-practice"
                  : "border-compositor-config/35 bg-compositor-config/10 text-compositor-config"
              }`}
            >
              {isExpanded ? (
                <Square className="size-3" aria-hidden="true" />
              ) : (
                <Play className="size-3.5" aria-hidden="true" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-xs font-semibold text-text-primary">
                  {cycle.nombre}
                </span>
                <CompositorCycleLayerIcons piece={cycle.piece} compact />
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-text-muted">
                {formatCompositorCycleSummary(cycle.piece)}
                {" · "}
                {cycle.storage === "remote" ? "Nube" : "Local"}
                {cycle.esPublico ? ` · ${COMPOSITOR_LABEL_COMPARTIDO_COMUNIDAD}` : ""}
              </span>
            </span>

            <ChevronDown
              className={`size-4 shrink-0 text-text-muted transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          <TapButton
            type="button"
            disabled={controlsDisabled}
            onClick={onEdit}
            aria-label={`${COMPOSITOR_LABEL_EDITAR_CICLO} ${cycle.nombre}`}
            className={CYCLE_CARD_ACTION_BUTTON_CLASS}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </TapButton>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {isExpanded && isPlaybackActive ? (
            <div className="border-t border-tool-practice/20 px-2.5 pb-2.5 pt-2">
              <CompositorListenView
                layout="compact"
                piece={piece}
                activeTrackId={activeTrackId}
                selectedEventId={selectedEventId}
                bpm={bpm}
                tonalidadComposicion={tonalidadComposicion}
                isPlaying={isPlaying}
                cycleProgress={cycleProgress}
                listenMutedTrackIds={listenMutedTrackIds}
                onSetBpm={onSetBpm}
                onSetTonalidadComposicion={onSetTonalidadComposicion}
                onToggleListenTrack={onToggleListenTrack}
                onEnterListen={onEnterListen}
                onStart={onStart}
                onStop={onStop}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
