"use client";

import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
} from "@/lib/metronomo";
import { RITMO_LABEL_GOLPES_TAB } from "@/lib/ritmo-terminologia";

type CifradoCompasTypeStepperProps = {
  cycleGolpes: number;
  onCycleGolpesChange: (golpes: number) => void;
  labelClass: string;
  density?: "default" | "compact";
};

export function CifradoCompasTypeStepper({
  cycleGolpes,
  onCycleGolpesChange,
  labelClass,
  density = "compact",
}: CifradoCompasTypeStepperProps) {
  return (
    <div className="min-w-[8.5rem] shrink-0">
      <p className={labelClass}>{RITMO_LABEL_GOLPES_TAB}</p>
      <div className="mt-1.5">
        <ToolNumericStepper
          value={cycleGolpes}
          density={density}
          decrementDisabled={cycleGolpes <= BEATS_PER_MEASURE_MIN}
          incrementDisabled={cycleGolpes >= BEATS_PER_MEASURE_MAX}
          decrementAriaLabel="Reducir golpes"
          incrementAriaLabel="Aumentar golpes"
          inputId="cifrado-cycle-golpes"
          min={BEATS_PER_MEASURE_MIN}
          max={BEATS_PER_MEASURE_MAX}
          onDecrement={() => onCycleGolpesChange(cycleGolpes - 1)}
          onIncrement={() => onCycleGolpesChange(cycleGolpes + 1)}
          onSetValue={(value) => onCycleGolpesChange(value)}
        />
      </div>
    </div>
  );
}
