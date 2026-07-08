"use client";

import {
  BpmSetupPanel,
  type BpmSetupAccent,
} from "@/components/ui/ToolRitmoConfig";
import { ritmoDesktopSectionTitleClass } from "@/lib/ritmo-compas-ui";
import { RITMO_LABEL_TEMPO } from "@/lib/ritmo-terminologia";

/**
 * Controles de tempo para escritorio: delega en BpmSetupPanel unificado.
 */
export function CompositorDesktopTempoBar({
  bpm,
  isPlaying = false,
  tapTempoTapCount,
  disabled = false,
  accent = "compositor",
  showLabel = true,
  onSetBpm,
  onTapTempo,
}: {
  bpm: number;
  isPlaying?: boolean;
  tapTempoTapCount: number;
  disabled?: boolean;
  accent?: BpmSetupAccent;
  showLabel?: boolean;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  const titleClass = ritmoDesktopSectionTitleClass(accent);

  return (
    <div className="w-fit">
      {showLabel ? (
        <p className={titleClass}>
          {RITMO_LABEL_TEMPO}
        </p>
      ) : null}
      <BpmSetupPanel
        bpm={bpm}
        isPlaying={isPlaying}
        tapTempoTapCount={tapTempoTapCount}
        disabled={disabled}
        accent={accent}
        onSetBpm={onSetBpm}
        onTapTempo={onTapTempo}
      />
    </div>
  );
}
