"use client";

import { Mic, MicOff } from "lucide-react";
import { TapButton } from "@/components/ui/TapFeedback";

type MicToggleButtonSize = "default" | "sm";

const OUTER_SIZE: Record<MicToggleButtonSize, string> = {
  default: "size-16",
  sm: "size-12",
};

const ICON_SIZE: Record<MicToggleButtonSize, string> = {
  default: "size-7",
  sm: "size-5",
};

export type MicToggleButtonProps = {
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: MicToggleButtonSize;
  activeAriaLabel?: string;
  inactiveAriaLabel?: string;
  showInactiveLabel?: boolean;
};

export function MicToggleButton({
  isActive,
  onClick,
  disabled = false,
  size = "sm",
  activeAriaLabel = "Desactivar micrófono",
  inactiveAriaLabel = "Activar micrófono",
  showInactiveLabel = true,
}: MicToggleButtonProps) {
  const outerSize = OUTER_SIZE[size];
  const iconSize = ICON_SIZE[size];

  return (
    <TapButton
      type="button"
      disabled={disabled}
      aria-label={isActive ? activeAriaLabel : inactiveAriaLabel}
      aria-pressed={isActive}
      onClick={onClick}
      className="relative isolate flex touch-manipulation flex-row items-center gap-2.5 overflow-visible disabled:opacity-40"
    >
      {showInactiveLabel && !isActive ? (
        <span className="shrink-0 text-sm text-text-muted" aria-hidden="true">
          {inactiveAriaLabel}
        </span>
      ) : null}

      <div
        className={`relative flex shrink-0 items-center justify-center overflow-visible ${outerSize}`}
      >
        {isActive ? (
          <>
            <span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-voz-config/70 animate-[mic-ring-pulse_1.8s_ease-out_infinite]"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-voz-config/55 animate-[mic-ring-pulse_1.8s_ease-out_0.6s_infinite]"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-voz-config/40 animate-[mic-ring-pulse_1.8s_ease-out_1.2s_infinite]"
              aria-hidden="true"
            />
          </>
        ) : null}

        <span
          className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors ${outerSize} ${
            isActive
              ? "border-[color-mix(in_srgb,var(--voz-config)_60%,transparent)] bg-[color-mix(in_srgb,var(--voz-config)_18%,transparent)]"
              : "border-border bg-bg-card"
          }`}
        >
          {isActive ? (
            <Mic
              className={`${iconSize} text-voz-config`}
              aria-hidden="true"
            />
          ) : (
            <MicOff
              className={`${iconSize} text-text-muted opacity-60`}
              aria-hidden="true"
            />
          )}

          {isActive ? (
            <span
              className="pointer-events-none absolute right-1 top-1 size-2 rounded-full bg-voz-config animate-[mic-dot-blink_1s_ease-in-out_infinite]"
              aria-hidden="true"
            />
          ) : null}
        </span>
      </div>
    </TapButton>
  );
}
