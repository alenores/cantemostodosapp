"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Play, Square } from "lucide-react";

type PlayCircleButtonSize = "default" | "sm" | "xs";

const SIZE_CLASSES: Record<PlayCircleButtonSize, string> = {
  default: "size-16",
  sm: "size-12",
  xs: "size-9",
};

const ICON_SIZE_CLASSES: Record<PlayCircleButtonSize, string> = {
  default: "size-7",
  sm: "size-5",
  xs: "size-3.5",
};

export type PlayCircleButtonProps = {
  isPlaying?: boolean;
  onClick: () => void;
  playAriaLabel?: string;
  stopAriaLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: PlayCircleButtonSize;
  /** Solo muestra play (sin estado detener). */
  playOnly?: boolean;
};

export function PlayCircleButton({
  isPlaying = false,
  onClick,
  playAriaLabel = "Reproducir",
  stopAriaLabel = "Detener",
  disabled = false,
  className = "",
  size = "default",
  playOnly = false,
}: PlayCircleButtonProps) {
  const showStop = !playOnly && isPlaying;

  return (
    <TapButton
      type="button"
      disabled={disabled}
      aria-label={showStop ? stopAriaLabel : playAriaLabel}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-full border bg-bg-card text-text-primary disabled:opacity-40 ${SIZE_CLASSES[size]} ${
        showStop ? "border-text-secondary" : "border-border"
      } ${className}`.trim()}
    >
      {showStop ? (
        <Square
          className={`${ICON_SIZE_CLASSES[size]} fill-current`}
          aria-hidden="true"
        />
      ) : (
        <Play
          className={`${ICON_SIZE_CLASSES[size]} fill-current`}
          aria-hidden="true"
        />
      )}
    </TapButton>
  );
}
