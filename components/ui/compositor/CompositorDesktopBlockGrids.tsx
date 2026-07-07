"use client";

import { CompositorDrumIcon } from "@/components/ui/compositor/CompositorDrumIcon";
import {
  COMPOSITOR_DRUM_SOUND_OPTIONS,
  type CompositorDrumSound,
} from "@/lib/compositor";
import { compositorBlockOptionActiveClass } from "@/lib/compositor-block-edit-ui";
import { METRONOME_BEAT_LEVELS, getBeatLevelLabel } from "@/lib/metronomo";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

/**
 * Reemplazo de escritorio para CompositorOptionCarousel (timbre de batería).
 * En vez de flecha izq/der con un valor a la vez, muestra todas las opciones
 * como grilla clickeable — el mouse tiene espacio de sobra para esto.
 */
export function CompositorDesktopDrumSoundGrid({
  value,
  disabled = false,
  mode = "create",
  onChange,
}: {
  value: CompositorDrumSound;
  disabled?: boolean;
  mode?: "create" | "edit";
  onChange: (sound: CompositorDrumSound) => void;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5 lg:grid-cols-7"
      role="radiogroup"
      aria-label="Timbre de batería"
    >
      {COMPOSITOR_DRUM_SOUND_OPTIONS.map((option) => {
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            title={option.label}
            onClick={() => onChange(option.id)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition-colors disabled:opacity-50 ${
              isActive
                ? compositorBlockOptionActiveClass(mode)
                : mode === "edit"
                  ? "border-border/50 bg-bg-dark text-text-muted hover:border-compositor-block-edit-border/40 hover:text-text-primary"
                  : "border-border bg-bg-dark text-text-muted hover:border-border-strong hover:text-text-primary"
            }`}
          >
            <CompositorDrumIcon sound={option.id} size="sm" />
            <span className="w-full truncate text-center text-[9px] font-bold leading-tight">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Reemplazo de escritorio para BeatVolumeCarousel (intensidad). Se repite
 * igual en el panel de batería y en el de melodías.
 */
export function CompositorDesktopIntensidadGrid({
  level,
  disabled = false,
  onSetLevel,
}: {
  level: MetronomeBeatLevel;
  disabled?: boolean;
  onSetLevel: (level: MetronomeBeatLevel) => void;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5"
      role="radiogroup"
      aria-label="Intensidad"
    >
      {METRONOME_BEAT_LEVELS.map((option) => {
        const isActive = level === option;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onSetLevel(option)}
            className={`rounded-lg border px-2 py-2 text-[11px] font-bold transition-colors disabled:opacity-50 ${
              isActive
                ? "border-compositor-config bg-compositor-config-bg text-compositor-config"
                : "border-border bg-bg-dark text-text-muted hover:border-border-strong hover:text-text-primary"
            }`}
          >
            {getBeatLevelLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
