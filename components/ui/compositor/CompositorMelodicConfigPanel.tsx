"use client";

import { useId, useState } from "react";
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
import { isNotaEnEscala, type ModoTonal } from "@/lib/cifrado-escala";
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
  COMPOSITOR_LABEL_AGREGAR_BLOQUE,
  COMPOSITOR_LABEL_BLOQUES_SELECCIONADOS,
  COMPOSITOR_LABEL_CANTIDAD_BLOQUES,
  COMPOSITOR_LABEL_CREAR_BLOQUE,
  COMPOSITOR_LABEL_EDITAR_BLOQUE,
  COMPOSITOR_LABEL_OCTAVA,
  RITMO_LABEL_INTENSIDAD,
  RITMO_LABEL_NOTA,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { METRONOME_BEAT_LEVELS, getBeatLevelLabel } from "@/lib/metronomo";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

const COMPOSITOR_ADD_BLOCK_COUNT_MIN = 1;
const COMPOSITOR_ADD_BLOCK_COUNT_MAX = 10;

function clampAddBlockCount(value: number): number {
  return Math.min(
    COMPOSITOR_ADD_BLOCK_COUNT_MAX,
    Math.max(COMPOSITOR_ADD_BLOCK_COUNT_MIN, Math.floor(value)),
  );
}

/** Vacío o inválido equivale a 1 al agregar bloques. */
function resolveAddBlockCount(text: string): number {
  const trimmed = text.trim();

  if (trimmed === "") {
    return COMPOSITOR_ADD_BLOCK_COUNT_MIN;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed)) {
    return COMPOSITOR_ADD_BLOCK_COUNT_MIN;
  }

  return clampAddBlockCount(parsed);
}

type CompositorMelodicConfigPanelMode = "create" | "edit" | "mass";

export type CompositorMelodicConfigPanelMassFields = {
  showTipo?: boolean;
  showGuitarAttack?: boolean;
  showIntensidad?: boolean;
};

type CompositorMelodicConfigPanelProps = {
  instrumentId: CompositorInstrumentId;
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  draft: CompositorMelodicDraft;
  visibleOctaves: number[];
  mode: CompositorMelodicConfigPanelMode;
  massFields?: CompositorMelodicConfigPanelMassFields;
  disabled?: boolean;
  onDraftChange: (draft: CompositorMelodicDraft) => void;
  onExitEdit?: () => void;
  onAddBlock?: (count: number) => void;
};

/** Estilos comparten la paleta de "edit" mientras se editan bloques (uno o varios). */
function editStyleMode(
  mode: CompositorMelodicConfigPanelMode,
): "create" | "edit" {
  return mode === "create" ? "create" : "edit";
}

function MelodicFieldGroup({
  label,
  mode,
  className,
  children,
}: {
  label: string;
  mode: CompositorMelodicConfigPanelMode;
  className?: string;
  children: React.ReactNode;
}) {
  const styleMode = editStyleMode(mode);

  return (
    <div className={`${compositorBlockFieldGroupClass(styleMode)} ${className ?? ""}`}>
      <p className={compositorBlockFieldLabelClass(styleMode)}>{label}</p>
      {children}
    </div>
  );
}

function SegmentToggle<T extends string | number>({
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
  mode: CompositorMelodicConfigPanelMode;
  onChange: (value: T) => void;
}) {
  const styleMode = editStyleMode(mode);

  return (
    <div
      className="tool-segmented-control tool-segmented-control--inline flex gap-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-w-0 flex-1 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 lg:flex-none ${
            value === option.value
              ? compositorBlockSegmentActiveClass(styleMode)
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
  modoTonalComposicion,
  draft,
  visibleOctaves,
  mode,
  massFields,
  disabled = false,
  onDraftChange,
  onExitEdit,
  onAddBlock,
}: CompositorMelodicConfigPanelProps) {
  const blockCountInputId = useId();
  const [addBlockCountText, setAddBlockCountText] = useState(
    String(COMPOSITOR_ADD_BLOCK_COUNT_MIN),
  );
  const isMass = mode === "mass";
  const showTipoMass = massFields?.showTipo ?? true;
  const showGuitarAttackMass = massFields?.showGuitarAttack ?? true;
  const showIntensidadMass = massFields?.showIntensidad ?? false;
  const showHarmonyToggle =
    instrumentId === "piano" || instrumentId === "guitarra";
  const harmonyMode: "nota" | "acorde" =
    instrumentId === "piano"
      ? draft.pianoHarmonyMode
      : isGuitarChordArticulation(draft.guitarArticulation)
        ? "acorde"
        : "nota";
  const showModifier = isMelodicAcordeMode(instrumentId, draft);
  const guitarChordAttack: "rasguido" | "rasguidoArriba" | "bloque" =
    draft.guitarArticulation === "bloque"
      ? "bloque"
      : draft.guitarArticulation === "rasguidoArriba"
        ? "rasguidoArriba"
        : "rasguido";
  const showGuitarTimbreInline =
    instrumentId === "guitarra" && harmonyMode === "nota";
  const showGuitarAttackInline =
    instrumentId === "guitarra" && harmonyMode === "acorde";
  const desktopHalfTipoWidthClass =
    "lg:w-1/4 lg:max-w-[25%] lg:flex-none lg:shrink-0";
  const desktopHalfIntensidadWidthClass =
    "lg:w-1/2 lg:max-w-[50%] lg:flex-none lg:shrink-0";

  function setHarmonyMode(next: "nota" | "acorde") {
    if (instrumentId === "piano") {
      onDraftChange(
        applyPianoHarmonyMode(
          draft,
          next,
          tonalidadComposicion,
          modoTonalComposicion,
        ),
      );
      return;
    }

    if (instrumentId === "guitarra") {
      onDraftChange(
        applyGuitarHarmonyMode(
          draft,
          next,
          tonalidadComposicion,
          modoTonalComposicion,
        ),
      );
    }
  }

  function setGrado(grado: CompositorGradoCromatico) {
    onDraftChange(
      applyGradoToDraft(
        draft,
        grado,
        instrumentId,
        tonalidadComposicion,
        modoTonalComposicion,
      ),
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
        <p className={compositorBlockTitleClass(editStyleMode(mode))}>
          {isMass
            ? COMPOSITOR_LABEL_BLOQUES_SELECCIONADOS
            : mode === "edit"
              ? COMPOSITOR_LABEL_EDITAR_BLOQUE
              : COMPOSITOR_LABEL_CREAR_BLOQUE}
        </p>
        {(mode === "edit" || isMass) && onExitEdit ? (
          <CompositorBlockEditDismiss disabled={disabled} onDismiss={onExitEdit} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
          {showHarmonyToggle && (!isMass || showTipoMass) ? (
            <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
              <MelodicFieldGroup
                label="Tipo"
                mode={mode}
                className={`min-w-0 flex-1 ${
                  showGuitarTimbreInline || showGuitarAttackInline
                    ? desktopHalfTipoWidthClass
                    : ""
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
              {showGuitarTimbreInline && (!isMass || showGuitarAttackMass) ? (
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
              {showGuitarAttackInline && (!isMass || showGuitarAttackMass) ? (
                <MelodicFieldGroup
                  label="Ataque"
                  mode={mode}
                  className={`min-w-0 ${desktopHalfTipoWidthClass}`}
                >
                  <SegmentToggle
                    value={guitarChordAttack}
                    options={[
                      { value: "rasguido", label: "↓" },
                      { value: "rasguidoArriba", label: "↑" },
                      { value: "bloque", label: "Bloque" },
                    ]}
                    disabled={disabled}
                    ariaLabel="Rasguido abajo, arriba o bloque"
                    mode={mode}
                    onChange={(attack) =>
                      onDraftChange({
                        ...draft,
                        guitarArticulation:
                          attack as CompositorGuitarArticulation,
                      })
                    }
                  />
                </MelodicFieldGroup>
              ) : null}
              {!isMass || showIntensidadMass ? intensidadGroup : null}
            </div>
          ) : null}

          {!isMass ? (
            <MelodicFieldGroup label={RITMO_LABEL_NOTA} mode={mode}>
              <div
                className="grid grid-cols-6 gap-1 sm:grid-cols-12"
                role="toolbar"
                aria-label="Notas"
              >
                {COMPOSITOR_GRADO_OPTIONS.map((option) => {
                  const grado = option.id;
                  const noteIndex = gradoToNotaIndex(grado, tonalidadComposicion);
                  const enEscala = isNotaEnEscala(
                    noteIndex,
                    tonalidadComposicion,
                    modoTonalComposicion,
                  );
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
                          ? `${compositorBlockMelodicNoteActiveClass(editStyleMode(mode))} font-bold`
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
          ) : null}

          {!isMass ? (
            <MelodicFieldGroup label={COMPOSITOR_LABEL_OCTAVA} mode={mode}>
              <SegmentToggle
                value={draft.octavaRelativa}
                options={visibleOctaves.map((octave) => ({
                  value: octave,
                  label: String(octave),
                }))}
                disabled={disabled}
                ariaLabel={COMPOSITOR_LABEL_OCTAVA}
                mode={mode}
                onChange={(octave) =>
                  onDraftChange({ ...draft, octavaRelativa: octave })
                }
              />
            </MelodicFieldGroup>
          ) : null}

          {!isMass && showModifier ? (
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
                          ? compositorBlockPillActiveClass(editStyleMode(mode))
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

          {!showHarmonyToggle && (!isMass || showIntensidadMass)
            ? intensidadGroup
            : null}
      </div>

      {mode === "create" && onAddBlock ? (
        <div className="flex w-fit flex-wrap items-center gap-2 self-start">
          <label
            htmlFor={blockCountInputId}
            className="sr-only"
          >
            {COMPOSITOR_LABEL_CANTIDAD_BLOQUES}
          </label>
          <input
            id={blockCountInputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            disabled={disabled}
            value={addBlockCountText}
            aria-label={COMPOSITOR_LABEL_CANTIDAD_BLOQUES}
            onChange={(event) => {
              const raw = event.target.value;

              if (raw === "") {
                setAddBlockCountText("");
                return;
              }

              if (!/^\d+$/.test(raw)) {
                return;
              }

              const parsed = Number.parseInt(raw, 10);

              if (Number.isNaN(parsed)) {
                return;
              }

              if (parsed > COMPOSITOR_ADD_BLOCK_COUNT_MAX) {
                setAddBlockCountText(String(COMPOSITOR_ADD_BLOCK_COUNT_MAX));
                return;
              }

              setAddBlockCountText(raw.replace(/^0+(?=\d)/, ""));
            }}
            onBlur={() => {
              if (addBlockCountText.trim() === "") {
                return;
              }

              setAddBlockCountText(String(resolveAddBlockCount(addBlockCountText)));
            }}
            className="h-8 w-12 shrink-0 rounded-lg border border-border/70 bg-bg-dark/35 px-1 text-center text-xs font-bold tabular-nums text-text-primary outline-none disabled:opacity-50"
          />
          <TapButton
            type="button"
            disabled={disabled}
            onClick={() => onAddBlock(resolveAddBlockCount(addBlockCountText))}
            className="flex items-center justify-center rounded-lg border border-compositor-config/60 bg-compositor-config px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {COMPOSITOR_LABEL_AGREGAR_BLOQUE}
          </TapButton>
        </div>
      ) : null}
    </div>
  );
}
