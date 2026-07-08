"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { CompositorBlockEditDismiss } from "@/components/ui/compositor/CompositorBlockEditDismiss";
import type { CompositorMelodicDraft } from "@/lib/compositor-melodic-draft";
import {
  applyGradoToDraft,
  applyGuitarHarmonyMode,
  applyPianoHarmonyMode,
  isMelodicAcordeMode,
} from "@/lib/compositor-melodic-draft";
import {
  isGuitarChordArticulation,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
} from "@/lib/compositor";
import type { Modificador, NotaIndex } from "@/lib/cifrado";
import { MODIFICADORES, NOTAS_ES } from "@/lib/cifrado";
import { isNotaEnEscala } from "@/lib/cifrado-escala";
import {
  compositorBlockFieldGroupClass,
  compositorBlockFieldLabelClass,
  compositorBlockMelodicNoteActiveClass,
  compositorBlockPillActiveClass,
  compositorBlockSegmentActiveClass,
  compositorBlockTitleClass,
} from "@/lib/compositor-block-edit-ui";
import {
  COMPOSITOR_GRADO_OPTIONS,
  gradoToNotaIndex,
  type CompositorGradoCromatico,
} from "@/lib/compositor-melodic-pitch";
import {
  COMPOSITOR_LABEL_ARRASTRAR_GRAFICO,
  COMPOSITOR_LABEL_CREAR_BLOQUE,
  COMPOSITOR_LABEL_EDITAR_BLOQUE,
  RITMO_LABEL_INTENSIDAD,
  RITMO_LABEL_NOTA,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { METRONOME_BEAT_LEVELS, getBeatLevelLabel } from "@/lib/metronomo";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { GripHorizontal } from "lucide-react";

type CompositorMelodicConfigPanelProps = {
  instrumentId: CompositorInstrumentId;
  tonalidadComposicion: NotaIndex;
  draft: CompositorMelodicDraft;
  mode: "create" | "edit";
  disabled?: boolean;
  onDraftChange: (draft: CompositorMelodicDraft) => void;
  onExitEdit?: () => void;
  onPointerDownDrag: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

function MelodicFieldGroup({
  label,
  mode,
  className,
  children,
}: {
  label: string;
  mode: "create" | "edit";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${compositorBlockFieldGroupClass(mode)} ${className ?? ""}`}>
      <p className={compositorBlockFieldLabelClass(mode)}>{label}</p>
      {children}
    </div>
  );
}

function SegmentToggle<T extends string>({
  value,
  options,
  disabled,
  ariaLabel,
  mode,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  disabled?: boolean;
  ariaLabel: string;
  mode: "create" | "edit";
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="tool-segmented-control tool-segmented-control--inline flex gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-w-0 flex-1 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 lg:flex-none ${
            value === option.value
              ? compositorBlockSegmentActiveClass(mode)
              : "text-text-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CompositorMelodicConfigPanel({
  instrumentId,
  tonalidadComposicion,
  draft,
  mode,
  disabled = false,
  onDraftChange,
  onExitEdit,
  onPointerDownDrag,
}: CompositorMelodicConfigPanelProps) {
  const showHarmonyToggle =
    instrumentId === "piano" || instrumentId === "guitarra";
  const harmonyMode: "nota" | "acorde" =
    instrumentId === "piano"
      ? draft.pianoHarmonyMode
      : isGuitarChordArticulation(draft.guitarArticulation)
        ? "acorde"
        : "nota";
  const showModifier = isMelodicAcordeMode(instrumentId, draft);
  const guitarChordAttack: "rasguido" | "bloque" =
    draft.guitarArticulation === "bloque" ? "bloque" : "rasguido";
  const showGuitarTimbreInline =
    instrumentId === "guitarra" && harmonyMode === "nota";
  const desktopHalfTipoWidthClass =
    "lg:w-1/4 lg:max-w-[25%] lg:flex-none lg:shrink-0";
  const desktopHalfIntensidadWidthClass =
    "lg:w-1/2 lg:max-w-[50%] lg:flex-none lg:shrink-0";

  function setHarmonyMode(next: "nota" | "acorde") {
    if (instrumentId === "piano") {
      onDraftChange(applyPianoHarmonyMode(draft, next, tonalidadComposicion));
      return;
    }

    if (instrumentId === "guitarra") {
      onDraftChange(applyGuitarHarmonyMode(draft, next, tonalidadComposicion));
    }
  }

  function setGrado(grado: CompositorGradoCromatico) {
    onDraftChange(
      applyGradoToDraft(draft, grado, instrumentId, tonalidadComposicion),
    );
  }

  const intensidadGroup = (
    <MelodicFieldGroup
      label={RITMO_LABEL_INTENSIDAD}
      mode={mode}
      className={
        showHarmonyToggle
          ? "min-w-0 flex-1"
          : instrumentId === "viento"
            ? desktopHalfIntensidadWidthClass
            : undefined
      }
    >
      <SegmentToggle
        value={draft.level}
        options={METRONOME_BEAT_LEVELS.map((level) => ({
          value: level,
          label: getBeatLevelLabel(level),
        }))}
        disabled={disabled}
        ariaLabel={RITMO_LABEL_INTENSIDAD}
        mode={mode}
        onChange={(level) =>
          onDraftChange({ ...draft, level: level as MetronomeBeatLevel })
        }
      />
    </MelodicFieldGroup>
  );

  return (
    <div data-compositor-edit-surface="" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={compositorBlockTitleClass(mode)}>
          {mode === "edit"
            ? COMPOSITOR_LABEL_EDITAR_BLOQUE
            : COMPOSITOR_LABEL_CREAR_BLOQUE}
        </p>
        {mode === "edit" && onExitEdit ? (
          <CompositorBlockEditDismiss disabled={disabled} onDismiss={onExitEdit} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
          {showHarmonyToggle ? (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
              <MelodicFieldGroup
                label="Tipo"
                mode={mode}
                className={`min-w-0 flex-1 ${
                  showGuitarTimbreInline ? desktopHalfTipoWidthClass : ""
                }`}
              >
                <SegmentToggle
                  value={harmonyMode}
                  options={[
                    { value: "nota", label: "Nota" },
                    { value: "acorde", label: "Acorde" },
                  ]}
                  disabled={disabled}
                  ariaLabel="Nota o acorde"
                  mode={mode}
                  onChange={setHarmonyMode}
                />
              </MelodicFieldGroup>
              {showGuitarTimbreInline ? (
                <MelodicFieldGroup
                  label={RITMO_LABEL_TIMBRE}
                  mode={mode}
                  className={`min-w-0 ${desktopHalfTipoWidthClass}`}
                >
                  <SegmentToggle
                    value={
                      draft.guitarArticulation === "dedo" ? "dedo" : "pua"
                    }
                    options={[
                      { value: "pua", label: "Púa" },
                      { value: "dedo", label: "Dedo" },
                    ]}
                    disabled={disabled}
                    ariaLabel="Púa o dedo"
                    mode={mode}
                    onChange={(articulation) =>
                      onDraftChange({
                        ...draft,
                        guitarArticulation:
                          articulation as CompositorGuitarArticulation,
                      })
                    }
                  />
                </MelodicFieldGroup>
              ) : null}
              {intensidadGroup}
            </div>
          ) : null}

          <MelodicFieldGroup label={RITMO_LABEL_NOTA} mode={mode}>
            <div
              className="grid grid-cols-6 gap-1 sm:grid-cols-12"
              role="toolbar"
              aria-label="Notas"
            >
              {COMPOSITOR_GRADO_OPTIONS.map((option) => {
                const grado = option.id;
                const noteIndex = gradoToNotaIndex(grado, tonalidadComposicion);
                const enEscala = isNotaEnEscala(noteIndex, tonalidadComposicion);
                const noteName = NOTAS_ES[noteIndex];
                const isActive = draft.gradoCromatico === grado;

                return (
                  <button
                    key={grado}
                    type="button"
                    disabled={disabled}
                    title={noteName}
                    aria-label={noteName}
                    aria-pressed={isActive}
                    onClick={() => setGrado(grado)}
                    className={`rounded-lg px-1 py-1.5 text-center transition-colors disabled:opacity-50 ${
                      isActive
                        ? `${compositorBlockMelodicNoteActiveClass(mode)} font-bold`
                        : enEscala
                          ? "border border-border/70 bg-bg-dark/35 font-semibold text-text-primary"
                          : "border border-transparent bg-bg-dark/25 font-normal text-text-muted opacity-70"
                    }`}
                  >
                    <span className="block truncate text-[11px] leading-none">
                      {noteName}
                    </span>
                  </button>
                );
              })}
            </div>
          </MelodicFieldGroup>

          {showModifier ? (
            <MelodicFieldGroup label="Modificador" mode={mode}>
              <div className="flex flex-wrap gap-1">
                {MODIFICADORES.map((mod) => {
                  const isActive = draft.chordModifier === mod.id;
                  return (
                    <button
                      key={mod.id || "maj"}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          chordModifier: mod.id as Modificador,
                        })
                      }
                      className={`rounded-full px-2 py-1 text-[10px] disabled:opacity-50 ${
                        isActive
                          ? compositorBlockPillActiveClass(mode)
                          : "bg-bg-dark/40 text-text-secondary"
                      }`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            </MelodicFieldGroup>
          ) : null}

          {instrumentId === "guitarra" && harmonyMode === "acorde" ? (
            <MelodicFieldGroup label="Ataque" mode={mode}>
              <SegmentToggle
                value={guitarChordAttack}
                options={[
                  { value: "rasguido", label: "Rasguido" },
                  { value: "bloque", label: "Bloque" },
                ]}
                disabled={disabled}
                ariaLabel="Rasguido o bloque"
                mode={mode}
                onChange={(attack) =>
                  onDraftChange({
                    ...draft,
                    guitarArticulation: attack as CompositorGuitarArticulation,
                  })
                }
              />
            </MelodicFieldGroup>
          ) : null}


          {!showHarmonyToggle ? intensidadGroup : null}
      </div>

      {mode === "create" ? (
        <TapButton
          type="button"
          disabled={disabled}
          onPointerDown={onPointerDownDrag}
          className="flex w-fit touch-none items-center justify-center gap-2 self-start rounded-lg border border-dashed border-compositor-config/60 bg-compositor-config/10 px-4 py-1.5 text-xs font-bold text-compositor-config disabled:opacity-50"
        >
          <GripHorizontal className="size-4" aria-hidden="true" />
          {COMPOSITOR_LABEL_ARRASTRAR_GRAFICO}
        </TapButton>
      ) : null}
    </div>
  );
}
