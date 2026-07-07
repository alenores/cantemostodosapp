"use client";

import type { CompositorPiece } from "@/lib/compositor";
import { getCompositorCycleDurationSeconds } from "@/lib/compositor-timeline";
import { RITMO_LABEL_TEMPO } from "@/lib/ritmo-terminologia";

type CompositorSharedCycleSummaryProps = {
  piece: CompositorPiece;
};

export function CompositorSharedCycleSummary({
  piece,
}: CompositorSharedCycleSummaryProps) {
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const golpeLabel = piece.cycleGolpes === 1 ? "golpe" : "golpes";

  return (
    <div aria-live="polite" aria-atomic="true">
      <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
        <span className="font-bold text-text-primary">
          {piece.cycleGolpes} {golpeLabel}
        </span>
        {" · "}
        <span className="font-bold text-text-primary">
          ~{cycleSeconds.toFixed(1)} s
        </span>
        {" por ciclo · "}
        {piece.bpm} {RITMO_LABEL_TEMPO}
      </p>
    </div>
  );
}
