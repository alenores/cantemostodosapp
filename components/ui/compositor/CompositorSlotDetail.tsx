"use client";

import { TargetPickerBody } from "@/components/ui/entrenador-vocal/EntrenadorVocalShared";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  COMPOSITOR_DRUM_SOUND_OPTIONS,
  COMPOSITOR_GUITAR_ARTICULATION_OPTIONS,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorSlotNote,
} from "@/lib/compositor";
import {
  COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS,
} from "@/lib/ritmo-compas-ui";
import {
  formatGolpeLabel,
  RITMO_HELP_CONTENIDO_NOTA,
  RITMO_HELP_TIMBRE_BATERIA,
  RITMO_HELP_TIMBRE_GUITARRA,
  RITMO_LABEL_CONTENIDO,
  RITMO_LABEL_SUSTENTO,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { ChevronLeft, ChevronRight } from "lucide-react";

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function CompositorOptionCarousel<T extends string>({
  options,
  value,
  disabled = false,
  accentClassName = "text-compositor-config",
  onChange,
  decrementAriaLabel,
  incrementAriaLabel,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  disabled?: boolean;
  accentClassName?: string;
  onChange: (value: T) => void;
  decrementAriaLabel: string;
  incrementAriaLabel: string;
}) {
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const prevOption = options[wrapIndex(currentIndex - 1, options.length)]!;
  const currentOption = options[currentIndex] ?? options[0]!;
  const nextOption = options[wrapIndex(currentIndex + 1, options.length)]!;

  function changeOption(delta: number) {
    const nextIndex = wrapIndex(currentIndex + delta, options.length);
    onChange(options[nextIndex]!.id);
  }

  return (
    <div
      className={`flex items-center gap-1 ${COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS}`}
    >
      <TapButton
        type="button"
        aria-label={decrementAriaLabel}
        disabled={disabled}
        onClick={() => changeOption(-1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>

      <div className="relative min-w-0 flex-1">
        <div
          className="pointer-events-none absolute inset-y-1 left-0 z-10 w-5 rounded-l-[8px] bg-gradient-to-r from-bg-card via-bg-card/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-1 right-0 z-10 w-5 rounded-r-[8px] bg-gradient-to-l from-bg-card via-bg-card/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-1 left-1/2 z-[1] w-[3.75rem] -translate-x-1/2 rounded-[8px] border border-compositor-config/35 bg-compositor-config/10"
          aria-hidden="true"
        />

        <div
          className="relative flex h-14 items-center justify-center overflow-hidden rounded-[10px] border-2 border-border bg-bg-dark"
          aria-live="polite"
          aria-label={currentOption.label}
        >
          <div className="flex items-center justify-center gap-4">
            <span className="w-16 truncate text-center text-sm font-semibold text-text-muted opacity-45">
              {prevOption.label}
            </span>
            <span
              className={`min-w-[4.5rem] truncate text-center text-xl font-extrabold leading-none ${accentClassName}`}
            >
              {currentOption.label}
            </span>
            <span className="w-16 truncate text-center text-sm font-semibold text-text-muted opacity-45">
              {nextOption.label}
            </span>
          </div>
        </div>
      </div>

      <TapButton
        type="button"
        aria-label={incrementAriaLabel}
        disabled={disabled}
        onClick={() => changeOption(1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>
    </div>
  );
}

type CompositorSlotContenidoProps = {
  slotIndex: number;
  note: CompositorSlotNote;
  octaveExact: boolean;
  disabled?: boolean;
  embedded?: boolean;
  onSetOctaveExact: (value: boolean) => void;
  onSetNote: (note: CompositorSlotNote) => void;
};

export function CompositorSlotContenido({
  slotIndex,
  note,
  octaveExact,
  disabled = false,
  embedded = false,
  onSetOctaveExact,
  onSetNote,
}: CompositorSlotContenidoProps) {
  const noteControls = (
    <TargetPickerBody
      target={note}
      onSetTarget={onSetNote}
      octaveExact={octaveExact}
      onSetOctaveExact={onSetOctaveExact}
      disabled={disabled}
    />
  );

  if (embedded) {
    return noteControls;
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
        {RITMO_LABEL_CONTENIDO} · {formatGolpeLabel(slotIndex)}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">{RITMO_HELP_CONTENIDO_NOTA}</p>
      <div className="mt-3">{noteControls}</div>
    </div>
  );
}

type CompositorSlotTimbreProps = {
  instrumentId: Extract<CompositorInstrumentId, "guitarra" | "bateria">;
  slotIndex: number;
  drumSound: CompositorDrumSound;
  guitarArticulation: CompositorGuitarArticulation;
  disabled?: boolean;
  embedded?: boolean;
  onSetDrumSound: (sound: CompositorDrumSound) => void;
  onSetGuitarArticulation: (articulation: CompositorGuitarArticulation) => void;
};

export function CompositorSlotTimbre({
  instrumentId,
  slotIndex,
  drumSound,
  guitarArticulation,
  disabled = false,
  embedded = false,
  onSetDrumSound,
  onSetGuitarArticulation,
}: CompositorSlotTimbreProps) {
  if (instrumentId === "bateria") {
    const drumControls = (
      <CompositorOptionCarousel
        options={COMPOSITOR_DRUM_SOUND_OPTIONS}
        value={drumSound}
        disabled={disabled}
        onChange={onSetDrumSound}
        decrementAriaLabel="Timbre anterior"
        incrementAriaLabel="Timbre siguiente"
      />
    );

    if (embedded) {
      return drumControls;
    }

    return (
      <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
          {RITMO_LABEL_TIMBRE} · {formatGolpeLabel(slotIndex)}
        </p>
        <p className="mt-1 text-[11px] text-text-muted">{RITMO_HELP_TIMBRE_BATERIA}</p>
        <div className="mt-3">{drumControls}</div>
      </div>
    );
  }

  const articulationControls = (
    <CompositorOptionCarousel
      options={COMPOSITOR_GUITAR_ARTICULATION_OPTIONS}
      value={guitarArticulation}
      disabled={disabled}
      onChange={onSetGuitarArticulation}
      decrementAriaLabel="Timbre anterior"
      incrementAriaLabel="Timbre siguiente"
    />
  );

  if (embedded) {
    return articulationControls;
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
        {RITMO_LABEL_TIMBRE} · {formatGolpeLabel(slotIndex)}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">{RITMO_HELP_TIMBRE_GUITARRA}</p>
      <div className="mt-3">{articulationControls}</div>
      <p className="mt-3 text-[10px] leading-snug text-text-muted">
        {RITMO_LABEL_SUSTENTO}: púa (corto) o rasguido (más largo). Próximamente
        configurable por golpe.
      </p>
    </div>
  );
}

export function compositorHasContenidoTab(
  instrumentId: CompositorInstrumentId,
): boolean {
  return instrumentId === "piano" || instrumentId === "guitarra";
}

export function compositorHasTimbreTab(
  instrumentId: CompositorInstrumentId,
): boolean {
  return instrumentId === "guitarra" || instrumentId === "bateria";
}
