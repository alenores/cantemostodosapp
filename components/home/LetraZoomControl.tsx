"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  LETRA_ZOOM_MAX_LEVEL,
  LETRA_ZOOM_MIN_LEVEL,
  type LetraZoomLevel,
} from "@/lib/letra-zoom";

type LetraZoomControlProps = {
  level: LetraZoomLevel;
  enabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

export default function LetraZoomControl({
  level,
  enabled = true,
  onDecrease,
  onIncrease,
}: LetraZoomControlProps) {
  const isAdjusted = level !== 0;

  return (
    <div
      className={`flex w-fit shrink-0 select-none items-center rounded-2xl border bg-bg-dark/90 p-0.5 backdrop-blur-md ${
        isAdjusted ? "border-accent/30" : "border-border/50"
      }`}
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.28)" }}
    >
      <TapButton
        type="button"
        aria-label="Achicar letra"
        disabled={!enabled || level <= LETRA_ZOOM_MIN_LEVEL}
        onClick={onDecrease}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 px-1 disabled:opacity-30"
      >
        <span
          className="text-[11px] font-bold leading-none text-accent"
          aria-hidden="true"
        >
          −A
        </span>
      </TapButton>

      <TapButton
        type="button"
        aria-label="Agrandar letra"
        disabled={!enabled || level >= LETRA_ZOOM_MAX_LEVEL}
        onClick={onIncrease}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 px-1 disabled:opacity-30"
      >
        <span
          className="text-[11px] font-bold leading-none text-accent"
          aria-hidden="true"
        >
          +A
        </span>
      </TapButton>
    </div>
  );
}
