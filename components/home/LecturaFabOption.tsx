"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const LECTURA_FAB_CASCADE_STEP_MS = 55;

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-cola-sheet text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";

export type LecturaFabStep = {
  content: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
};

export type LecturaFabItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
  iconAfter?: boolean;
  className?: string;
  /** Atajos al lado del botón. No cierran el menú. */
  steps?: {
    decrease: LecturaFabStep;
    increase: LecturaFabStep;
  };
};

type LecturaFabOptionProps = Omit<LecturaFabItem, "key"> & {
  cascadeIndex: number;
};

function LecturaFabStepButton({
  step,
}: {
  step: LecturaFabStep;
}) {
  return (
    <TapButton
      type="button"
      aria-label={step.ariaLabel}
      disabled={step.disabled}
      onClick={step.onClick}
      className={`pointer-events-auto flex size-9 shrink-0 items-center justify-center disabled:opacity-40 ${FLOAT_BTN_SECONDARY}`}
    >
      {step.content}
    </TapButton>
  );
}

export function LecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  muted = false,
  iconAfter = false,
  cascadeIndex,
  className = "",
  steps,
}: LecturaFabOptionProps) {
  const iconNode = (
    <Icon
      className={`size-4 shrink-0 ${muted ? "text-text-muted" : ""}`}
      aria-hidden="true"
    />
  );

  const enterStyle = {
    animationDelay: `${cascadeIndex * LECTURA_FAB_CASCADE_STEP_MS}ms`,
  };

  const mainButton = (
    <TapButton
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY} ${
        disabled ? FLOAT_BTN_DISABLED : ""
      } ${steps ? "" : `sala-lectura-fab-item ${className}`}`}
      style={steps ? undefined : enterStyle}
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

  if (!steps) {
    return mainButton;
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={`sala-lectura-fab-item pointer-events-auto flex items-center gap-1.5 ${className}`}
      style={enterStyle}
    >
      <LecturaFabStepButton step={steps.decrease} />
      {mainButton}
      <LecturaFabStepButton step={steps.increase} />
    </div>
  );
}
