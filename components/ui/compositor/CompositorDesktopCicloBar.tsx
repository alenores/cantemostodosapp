"use client";

import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  getActiveBeatDurationSlice,
  getBeatDurationAtIndex,
  getBeatDurationLabel,
  getBeatDurationOptionIndex,
} from "@/lib/metronomo";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import {
  ritmoDesktopSectionHintClass,
  ritmoDesktopSectionTitleClass,
  type RitmoDesktopConfigAccent,
} from "@/lib/ritmo-compas-ui";
import {
  RITMO_DESKTOP_CLICK_HINT,
  RITMO_LABEL_FIGURA_DESKTOP,
  RITMO_LABEL_GOLPES_TAB,
} from "@/lib/ritmo-terminologia";

const FIGURA_GLYPH: Record<MetronomeBeatDuration, string> = {
  redonda: "○",
  blanca: "𝅗𝅥",
  negra: "♩",
  corchea: "♪",
  semicorchea: "𝅘𝅥𝅯",
};

/**
 * Franja compacta de Ciclo para escritorio: golpes, figura por golpe (clic
 * directo para ciclar, sin panel expandido) — golpes y figuras en una fila,
 * mismo tamaño de control que las grillas de timbre/intensidad. Reemplaza
 * a ToolRitmoCompasPanel (pensado para dedo, con carruseles grandes) dentro
 * del Compositor de escritorio. El tempo va en CompositorDesktopTempoBar.
 */
export function CompositorDesktopCicloBar({
  cycleGolpes,
  cycleBeatDurations,
  disabled = false,
  size = "compact",
  accent,
  accentVar,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
}: {
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  disabled?: boolean;
  size?: "compact" | "comfortable";
  accent?: RitmoDesktopConfigAccent;
  accentVar?: string;
  onSetCycleGolpes: (value: number) => void;
  onSetCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
}) {
  const activeDurations = getActiveBeatDurationSlice(
    cycleBeatDurations,
    cycleGolpes,
  );

  function cycleFigura(slotIndex: number, current: MetronomeBeatDuration) {
    const nextIndex =
      (getBeatDurationOptionIndex(current) + 1) %
      5; /* 5 opciones de figura */
    onSetCycleBeatDurationAtSlot(slotIndex, getBeatDurationAtIndex(nextIndex));
  }

  const comfortable = size === "comfortable";
  const mutedLabelClass = comfortable
    ? "mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted"
    : "mb-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted";
  const accentTitleClass = accent
    ? ritmoDesktopSectionTitleClass(accent)
    : mutedLabelClass;
  const figuraButtonClass = comfortable
    ? "flex h-9 min-w-[2.25rem] flex-1 items-center justify-center rounded-md border border-border bg-bg-dark text-base text-text-secondary disabled:opacity-40 hover:border-border-strong"
    : "flex h-6 flex-1 items-center justify-center rounded border border-border bg-bg-dark text-sm text-text-secondary disabled:opacity-40 hover:border-border-strong";

  return (
    <div
      className={
        comfortable
          ? "flex flex-wrap items-end gap-8"
          : "flex flex-wrap items-end gap-6"
      }
    >
      <div className={comfortable ? "min-w-[11rem]" : "min-w-[10rem]"}>
        <p className={accentTitleClass}>{RITMO_LABEL_GOLPES_TAB}</p>
        <ToolNumericStepper
          value={cycleGolpes}
          density={comfortable ? "default" : "compact"}
          disabled={disabled}
          decrementDisabled={cycleGolpes <= BEATS_PER_MEASURE_MIN}
          incrementDisabled={cycleGolpes >= BEATS_PER_MEASURE_MAX}
          decrementAriaLabel="Reducir golpes"
          incrementAriaLabel="Aumentar golpes"
          onDecrement={() => onSetCycleGolpes(cycleGolpes - 1)}
          onIncrement={() => onSetCycleGolpes(cycleGolpes + 1)}
          accentVar={accentVar || (accent === "compositor" ? "--accent-compositor" : "--accent-vocal")}
        />
      </div>

      <div className={comfortable ? "min-w-[min(100%,28rem)] flex-1" : "min-w-[200px] flex-1"}>
        {accent ? (
          <p className={ritmoDesktopSectionTitleClass(accent)}>
            {RITMO_LABEL_FIGURA_DESKTOP}
          </p>
        ) : (
          <p className={mutedLabelClass}>Figura por golpe</p>
        )}
        <p className={ritmoDesktopSectionHintClass}>{RITMO_DESKTOP_CLICK_HINT}</p>
        <div className="mt-2 flex gap-1">
          {activeDurations.map((duration, index) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => cycleFigura(index, duration)}
              title={`${getBeatDurationLabel(duration)} · golpe ${index + 1}`}
              className={figuraButtonClass}
            >
              {FIGURA_GLYPH[duration]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
