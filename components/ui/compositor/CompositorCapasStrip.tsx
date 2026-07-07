"use client";

import { CompositorMelodicInstrumentIcon } from "@/components/ui/compositor/CompositorMelodicInstrumentIcon";
import {
  COMPOSITOR_CAPA_TAB_ACTIVE_CLASS,
} from "@/lib/compositor-instrument-colors";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
} from "@/lib/compositor";
import {
  COMPOSITOR_HELP_CAPA_EDITAR,
  RITMO_LABEL_CAPAS,
} from "@/lib/ritmo-terminologia";
export type CompositorEditCapasConfig = {
  activeTrackId: CompositorInstrumentId;
  onSelectTrack: (instrumentId: CompositorInstrumentId) => void;
};

const CAPA_TAB_ACTIVE_CLASS = COMPOSITOR_CAPA_TAB_ACTIVE_CLASS;

const MELODIC_CAPA_ACTIVE_RING: Record<CompositorMelodicInstrumentId, string> = {
  piano:
    "shadow-[0_0_0_2px_color-mix(in_srgb,var(--compositor-block-piano)_45%,transparent)]",
  guitarra:
    "shadow-[0_0_0_2px_color-mix(in_srgb,var(--compositor-block-guitarra)_55%,transparent)]",
  viento:
    "shadow-[0_0_0_2px_color-mix(in_srgb,var(--compositor-block-viento)_45%,transparent)]",
};

export function CompositorMelodicCapasTabs({
  activeTrackId,
  disabled = false,
  onSelectTrack,
}: CompositorEditCapasConfig & { disabled?: boolean }) {
  const melodicOptions = COMPOSITOR_INSTRUMENT_OPTIONS.filter((option) =>
    (["piano", "guitarra", "viento"] as CompositorInstrumentId[]).includes(
      option.id,
    ),
  );

  return (
    <div
      data-compositor-edit-surface=""
      className="grid w-fit max-w-full grid-cols-3 gap-2.5 sm:max-w-[18rem] lg:max-w-[19rem] lg:gap-3"
      role="tablist"
      aria-label={`${RITMO_LABEL_CAPAS} · melodías`}
    >
      {melodicOptions.map((option) => {
        const isActive = activeTrackId === option.id;
        const melodicId = option.id as CompositorMelodicInstrumentId;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelectTrack(option.id)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 transition-[color,background-color,box-shadow,transform] disabled:opacity-50 lg:gap-1.5 lg:px-2 lg:py-3 ${
              isActive
                ? `${CAPA_TAB_ACTIVE_CLASS[option.id]} border-transparent ${MELODIC_CAPA_ACTIVE_RING[melodicId]} scale-[1.02]`
                : "border-border/70 bg-bg-card/55 text-text-muted hover:border-border hover:bg-bg-card hover:text-text-primary"
            }`}
          >
            <CompositorMelodicInstrumentIcon
              instrumentId={melodicId}
              className={`size-5 lg:size-7 ${isActive ? "" : "opacity-75"}`}
            />
            <span className="block w-full truncate text-center text-[9px] font-bold leading-tight lg:text-[10px]">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CompositorCapasTabs({
  activeTrackId,
  disabled = false,
  onSelectTrack,
}: CompositorEditCapasConfig & { disabled?: boolean }) {
  return (
    <div
      data-compositor-edit-surface=""
      className="tool-segmented-control tool-segmented-control--inline flex min-w-0 gap-1"
      role="tablist"
      aria-label={`${RITMO_LABEL_CAPAS} · editar`}
    >
      {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
        const isActive = activeTrackId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelectTrack(option.id)}
            className={`min-w-0 flex-1 shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition-colors disabled:opacity-50 lg:flex-none ${
              isActive
                ? CAPA_TAB_ACTIVE_CLASS[option.id]
                : "text-text-muted"
            }`}
          >
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CompositorCapasStrip({
  activeTrackId,
  disabled = false,
  onSelectTrack,
}: CompositorEditCapasConfig & { disabled?: boolean }) {
  return (
    <div className="mt-2 rounded-[10px] border border-compositor-config-border bg-compositor-config-bg px-2.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
        {RITMO_LABEL_CAPAS} · editar
      </p>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
          const isActive = activeTrackId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTrack(option.id)}
              className={`min-w-0 rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-50 ${
                isActive
                  ? "border-compositor-config bg-compositor-config text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--compositor-config)_35%,transparent)]"
                  : "border-border/80 bg-bg-dark/80 text-text-primary"
              }`}
            >
              <span className="block truncate text-[11px] font-bold leading-tight">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_CAPA_EDITAR}
      </p>
    </div>
  );
}
