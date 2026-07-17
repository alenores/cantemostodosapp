"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useState } from "react";

export type ToolNumericStepperDensity = "default" | "compact";

const DENSITY_STYLES: Record<
  ToolNumericStepperDensity,
  {
    rowMinHeight: string;
    buttonWidth: string;
    valueText: string;
    suffixText: string;
    captionText: string;
    buttonText: string;
    inputText: string;
  }
> = {
  default: {
    rowMinHeight: "min-h-[3.25rem]",
    buttonWidth: "w-[3.25rem]",
    valueText: "text-3xl",
    suffixText: "text-[10px]",
    captionText: "text-[10px]",
    buttonText: "text-lg",
    inputText: "text-3xl",
  },
  compact: {
    rowMinHeight: "min-h-[2.25rem]",
    buttonWidth: "w-9",
    valueText: "text-sm",
    suffixText: "text-[9px]",
    captionText: "text-[9px]",
    buttonText: "text-base",
    inputText: "text-sm",
  },
};

export type ToolNumericStepperProps = {
  value: number;
  suffix?: string;
  caption?: string;
  disabled?: boolean;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementAriaLabel: string;
  incrementAriaLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  inputId?: string;
  min?: number;
  max?: number;
  onSetValue?: (value: number) => void;
  density?: ToolNumericStepperDensity;
  className?: string;
  accentVar?: string;
};

export function ToolNumericStepper({
  value,
  suffix,
  caption,
  disabled = false,
  decrementDisabled = false,
  incrementDisabled = false,
  decrementAriaLabel,
  incrementAriaLabel,
  onDecrement,
  onIncrement,
  inputId,
  min,
  max,
  onSetValue,
  density = "default",
  className = "",
  accentVar,
}: ToolNumericStepperProps) {
  const [isFocused, setIsFocused] = useState(false);
  const styles = DENSITY_STYLES[density];
  const editable = Boolean(inputId && onSetValue);
  const buttonClass = `flex shrink-0 ${styles.buttonWidth} ${styles.rowMinHeight} items-center justify-center rounded-sutil border border-border/70 bg-bg-dark/35 font-bold text-text-primary transition-colors disabled:opacity-40 ${styles.buttonText}`;

  return (
    <div className={`tool-numeric-stepper w-full ${className}`.trim()}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2">
        <TapButton
          type="button"
          aria-label={decrementAriaLabel}
          disabled={disabled || decrementDisabled}
          onClick={onDecrement}
          className={buttonClass}
        >
          −
        </TapButton>

        <div
          className={`flex ${styles.rowMinHeight} flex-col items-center justify-center rounded-estandar border bg-bg-card px-3 py-1.5 text-center transition-colors duration-150`}
          style={{
            borderColor: isFocused && accentVar ? `var(${accentVar})` : "var(--border)",
          }}
          aria-live={editable ? "polite" : undefined}
        >
          {editable ? (
            <>
              <label className="sr-only" htmlFor={inputId}>
                Valor numérico
              </label>
              <input
                id={inputId}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                disabled={disabled}
                value={value}
                onFocus={() => setIsFocused(true)}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);

                  if (!Number.isNaN(parsed)) {
                    onSetValue?.(parsed);
                  }
                }}
                onBlur={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);

                  onSetValue?.(
                    Number.isNaN(parsed) ? (min ?? value) : parsed,
                  );
                  setIsFocused(false);
                }}
                className={`w-full max-w-[4.5rem] border-0 bg-transparent p-0 text-center font-extrabold leading-none text-text-primary outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${styles.inputText}`}
              />
            </>
          ) : (
            <p
              className={`font-extrabold leading-none tabular-nums text-text-primary ${styles.valueText}`}
            >
              {value}
            </p>
          )}
          {suffix ? (
            <p className={`mt-0.5 text-text-muted ${styles.suffixText}`}>
              {suffix}
            </p>
          ) : null}
        </div>

        <TapButton
          type="button"
          aria-label={incrementAriaLabel}
          disabled={disabled || incrementDisabled}
          onClick={onIncrement}
          className={buttonClass}
        >
          +
        </TapButton>
      </div>

      {caption ? (
        <p
          className={`mt-2 text-center font-semibold text-text-secondary ${styles.captionText}`}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
