"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { LETRA_AUTO_SCROLL_MAX_LEVEL } from "@/hooks/useLetraAutoScroll";
import { getLecturaAutoScrollBottomCss } from "@/lib/sala-layout";
import { ChevronDown, ChevronUp } from "lucide-react";

type AutoScrollControlProps = {
  level: number;
  maxLevel?: number;
  enabled?: boolean;
  onAccelerate: () => void;
  onDecelerate: () => void;
};

export default function AutoScrollControl({
  level,
  maxLevel = LETRA_AUTO_SCROLL_MAX_LEVEL,
  enabled = true,
  onAccelerate,
  onDecelerate,
}: AutoScrollControlProps) {
  const isScrolling = level > 0;

  return (
    <div
      className={`fixed z-[45] flex w-fit shrink-0 select-none items-center rounded-2xl border bg-bg-dark/90 p-0.5 backdrop-blur-md ${
        isScrolling ? "border-accent/30" : "border-border/50"
      }`}
      style={{
        bottom: getLecturaAutoScrollBottomCss(),
        right: 16,
        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
      }}
    >
      <TapButton
        type="button"
        aria-label="Desacelerar desplazamiento de la letra"
        disabled={!enabled || level === 0}
        onClick={onDecelerate}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 disabled:opacity-30"
      >
        <ChevronUp className="size-4 text-accent" aria-hidden="true" />
      </TapButton>

      {level > 0 ? (
        <span
          className="w-[14px] shrink-0 text-center text-[11px] font-bold leading-none text-white"
          aria-live="polite"
          aria-label={`Velocidad de desplazamiento: ${level}`}
        >
          {level}
        </span>
      ) : null}

      <TapButton
        type="button"
        aria-label="Acelerar desplazamiento de la letra"
        disabled={!enabled || level >= maxLevel}
        onClick={onAccelerate}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 disabled:opacity-30"
      >
        <ChevronDown className="size-4 text-accent" aria-hidden="true" />
      </TapButton>
    </div>
  );
}
