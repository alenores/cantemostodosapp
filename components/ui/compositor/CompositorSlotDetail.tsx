"use client";

import { NoteCarousel } from "@/components/ui/entrenador-vocal/EntrenadorVocalShared";
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
  formatGolpeLabel,
  RITMO_HELP_CONTENIDO_NOTA,
  RITMO_HELP_TIMBRE_BATERIA,
  RITMO_HELP_TIMBRE_GUITARRA,
  RITMO_LABEL_CONTENIDO,
  RITMO_LABEL_SUSTENTO,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { VOZ_OCTAVES } from "@/lib/voz";

type CompositorSlotContenidoProps = {
  slotIndex: number;
  note: CompositorSlotNote;
  disabled?: boolean;
  embedded?: boolean;
  onSetNote: (note: CompositorSlotNote) => void;
};

export function CompositorSlotContenido({
  slotIndex,
  note,
  disabled = false,
  embedded = false,
  onSetNote,
}: CompositorSlotContenidoProps) {
  const noteControls = (
    <>
      <NoteCarousel target={note} onSetTarget={onSetNote} />
      <div className="mt-3 flex items-center justify-center gap-2">
        {VOZ_OCTAVES.map((octave) => (
          <TapButton
            key={octave}
            type="button"
            disabled={disabled}
            onClick={() => onSetNote({ ...note, octave })}
            className={`min-w-9 rounded-full px-2 py-1.5 text-xs font-bold disabled:opacity-50 ${
              note.octave === octave
                ? "bg-compositor-config text-white"
                : "border border-border bg-bg-dark text-text-muted"
            }`}
          >
            {octave}
          </TapButton>
        ))}
      </div>
    </>
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
      <div className="flex flex-wrap justify-center gap-2">
        {COMPOSITOR_DRUM_SOUND_OPTIONS.map((option) => (
          <TapButton
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSetDrumSound(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
              drumSound === option.id
                ? "bg-compositor-config text-white"
                : "border border-border bg-bg-dark text-text-muted"
            }`}
          >
            {option.label}
          </TapButton>
        ))}
      </div>
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
    <div className="flex flex-wrap justify-center gap-2">
      {COMPOSITOR_GUITAR_ARTICULATION_OPTIONS.map((option) => (
        <TapButton
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onSetGuitarArticulation(option.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
            guitarArticulation === option.id
              ? "bg-compositor-config text-white"
              : "border border-border bg-bg-dark text-text-muted"
          }`}
        >
          {option.label}
        </TapButton>
      ))}
    </div>
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
