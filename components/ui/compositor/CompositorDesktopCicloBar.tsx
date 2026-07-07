"use client";

import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  BPM_MAX,
  BPM_MIN,
  getActiveBeatDurationSlice,
  getBeatDurationAtIndex,
  getBeatDurationLabel,
  getBeatDurationOptionIndex,
} from "@/lib/metronomo";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";

const FIGURA_GLYPH: Record<MetronomeBeatDuration, string> = {
  redonda: "○",
  blanca: "𝅗𝅥",
  negra: "♩",
  corchea: "♪",
  semicorchea: "𝅘𝅥𝅯",
};

/**
 * Franja compacta de Ciclo para escritorio: golpes, figura por golpe (clic
 * directo para ciclar, sin panel expandido) y tempo — todo en una fila,
 * mismo tamaño de control que las grillas de timbre/intensidad. Reemplaza
 * a ToolRitmoCompasPanel + ToolRitmoTempoPanel (pensados para dedo, con
 * carruseles grandes) dentro del Compositor de escritorio.
 */
export function CompositorDesktopCicloBar({
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  disabled = false,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
  onSetBpm,
}: {
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  disabled?: boolean;
  onSetCycleGolpes: (value: number) => void;
  onSetCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBpm: (value: number) => void;
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

  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-2.5">
      <div>
        <p className="mb-1 text-[9px] text-text-muted">Golpes</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || cycleGolpes <= BEATS_PER_MEASURE_MIN}
            onClick={() => onSetCycleGolpes(cycleGolpes - 1)}
            aria-label="Reducir golpes"
            className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center text-xs font-bold text-text-primary">
            {cycleGolpes}
          </span>
          <button
            type="button"
            disabled={disabled || cycleGolpes >= BEATS_PER_MEASURE_MAX}
            onClick={() => onSetCycleGolpes(cycleGolpes + 1)}
            aria-label="Aumentar golpes"
            className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="min-w-[200px] flex-1">
        <p className="mb-1 text-[9px] text-text-muted">
          Figura por golpe · clic para cambiar
        </p>
        <div className="flex gap-[3px]">
          {activeDurations.map((duration, index) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => cycleFigura(index, duration)}
              title={`${getBeatDurationLabel(duration)} · golpe ${index + 1}`}
              className="flex h-6 flex-1 items-center justify-center rounded border border-border bg-bg-dark text-sm text-text-secondary disabled:opacity-40 hover:border-border-strong"
            >
              {FIGURA_GLYPH[duration]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[9px] text-text-muted">Tempo</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || bpm <= BPM_MIN}
            onClick={() => onSetBpm(bpm - 1)}
            aria-label="Reducir tempo"
            className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
          >
            −
          </button>
          <span className="w-9 text-center text-xs font-bold text-text-primary">
            {bpm}
          </span>
          <button
            type="button"
            disabled={disabled || bpm >= BPM_MAX}
            onClick={() => onSetBpm(bpm + 1)}
            aria-label="Aumentar tempo"
            className="flex size-[22px] items-center justify-center rounded border border-border bg-bg-dark text-sm font-bold text-text-primary disabled:opacity-40"
          >
            +
          </button>
          <span className="ml-1 text-[9px] text-text-muted">BPM</span>
        </div>
      </div>
    </div>
  );
}
