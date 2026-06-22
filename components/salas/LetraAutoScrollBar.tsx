"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { LETRA_AUTO_SCROLL_MAX_LEVEL } from "@/hooks/useLetraAutoScroll";
import { ChevronDown, ChevronUp } from "lucide-react";

type LetraAutoScrollBarProps = {
  enabled: boolean;
  autoScrollLevel: number;
  onAccelerate: () => void;
  onDecelerate: () => void;
  className?: string;
};

export default function LetraAutoScrollBar({
  enabled,
  autoScrollLevel,
  onAccelerate,
  onDecelerate,
  className = "",
}: LetraAutoScrollBarProps) {
  const isScrolling = autoScrollLevel > 0;

  return (
    <div className={`shrink-0 select-none ${className}`.trim()}>
      <div
        className={`flex shrink-0 items-center gap-0.5 rounded-full p-0.5 ${
          isScrolling ? "bg-accent/20" : "bg-bg-card"
        }`}
      >
        <TapButton
          type="button"
          aria-label="Desacelerar desplazamiento de la letra"
          disabled={!enabled || autoScrollLevel === 0}
          onClick={onDecelerate}
          className="flex size-7 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronUp className="size-3.5 text-text-primary" aria-hidden="true" />
        </TapButton>
        {isScrolling && (
          <span className="min-w-[10px] text-center text-[9px] font-bold leading-none text-accent">
            {autoScrollLevel}
          </span>
        )}
        <TapButton
          type="button"
          aria-label="Acelerar desplazamiento de la letra"
          disabled={!enabled || autoScrollLevel >= LETRA_AUTO_SCROLL_MAX_LEVEL}
          onClick={onAccelerate}
          className="flex size-7 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronDown className="size-3.5 text-text-primary" aria-hidden="true" />
        </TapButton>
      </div>
    </div>
  );
}
