"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";

export const LECTURA_FAB_CASCADE_STEP_MS = 55;

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";

export type LecturaFabItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
  iconAfter?: boolean;
  className?: string;
};

type LecturaFabOptionProps = Omit<LecturaFabItem, "key"> & {
  cascadeIndex: number;
};

export function LecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  muted = false,
  iconAfter = false,
  cascadeIndex,
  className = "",
}: LecturaFabOptionProps) {
  const iconNode = (
    <Icon
      className={`size-4 shrink-0 ${muted ? "text-text-muted" : ""}`}
      aria-hidden="true"
    />
  );

  return (
    <TapButton
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`sala-lectura-fab-item pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY} ${
        disabled ? FLOAT_BTN_DISABLED : ""
      } ${className}`}
      style={{
        animationDelay: `${cascadeIndex * LECTURA_FAB_CASCADE_STEP_MS}ms`,
      }}
    >
      {iconAfter ? (
        <>
          <span className={muted ? "text-text-muted" : undefined}>{label}</span>
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          <span className={muted ? "text-text-muted" : undefined}>{label}</span>
        </>
      )}
    </TapButton>
  );
}
