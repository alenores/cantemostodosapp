"use client";

import { useId, useState } from "react";
import { CompositorDesktopDrumSoundGrid } from "@/components/ui/compositor/CompositorDesktopBlockGrids";
import { CompositorBlockEditDismiss } from "@/components/ui/compositor/CompositorBlockEditDismiss";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorDrumDraft } from "@/lib/compositor-drum-draft";
import {
  compositorBlockFieldGroupClass,
  compositorBlockFieldLabelClass,
  compositorBlockSegmentActiveClass,
  compositorBlockTitleClass,
} from "@/lib/compositor-block-edit-ui";
import { COMPOSITOR_ADD_BLOCK_BUTTON_CLASS } from "@/lib/compositor-ui";
import {
  COMPOSITOR_LABEL_AGREGAR_BLOQUE,
  COMPOSITOR_LABEL_BLOQUES_SELECCIONADOS,
  COMPOSITOR_LABEL_CANTIDAD_BLOQUES,
  COMPOSITOR_LABEL_CREAR_BLOQUE,
  COMPOSITOR_LABEL_EDITAR_BLOQUE,
  RITMO_LABEL_INTENSIDAD,
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

type CompositorDrumEditPanelMode = "create" | "edit" | "mass";

export type CompositorDrumEditPanelMassFields = {
  showIntensidad?: boolean;
};

type CompositorDrumEditPanelProps = {
  draft: CompositorDrumDraft;
  mode: CompositorDrumEditPanelMode;
  massFields?: CompositorDrumEditPanelMassFields;
  disabled?: boolean;
  onDraftChange: (draft: CompositorDrumDraft) => void;
  onExitEdit?: () => void;
  onAddBlock?: (count?: number) => void;
};

/** Estilos comparten la paleta de "edit" mientras se editan bloques (uno o varios). */
function editStyleMode(mode: CompositorDrumEditPanelMode): "create" | "edit" {
  return mode === "create" ? "create" : "edit";
}

function DrumFieldGroup({
  label,
  mode,
  className,
  children,
}: {
  label: string;
  mode: CompositorDrumEditPanelMode;
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
  mode: CompositorDrumEditPanelMode;
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
          key={option.value}
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

export function CompositorDrumEditPanel({
  draft,
  mode,
  massFields,
  disabled = false,
  onDraftChange,
  onExitEdit,
  onAddBlock,
}: CompositorDrumEditPanelProps) {
  const blockCountInputId = useId();
  const [addBlockCountText, setAddBlockCountText] = useState("1");
  const isMass = mode === "mass";
  const showIntensidadMass = massFields?.showIntensidad ?? false;

  return (
    <div
      data-compositor-edit-surface=""
      className="space-y-2.5 rounded-lg border border-compositor-config/15 bg-[color-mix(in_srgb,var(--compositor-config)_5%,var(--bg-card))] px-2.5 py-2.5 lg:px-3 lg:py-3"
    >
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
        {!isMass ? (
          <DrumFieldGroup label={RITMO_LABEL_TIMBRE} mode={mode}>
            <CompositorDesktopDrumSoundGrid
              value={draft.drumSound}
              disabled={disabled}
              mode={editStyleMode(mode)}
              onChange={(sound) => onDraftChange({ ...draft, drumSound: sound })}
            />
          </DrumFieldGroup>
        ) : null}

        {!isMass || showIntensidadMass ? (
          <DrumFieldGroup
            label={RITMO_LABEL_INTENSIDAD}
            mode={mode}
            className="lg:w-1/2 lg:max-w-[50%] lg:flex-none lg:shrink-0"
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
          </DrumFieldGroup>
        ) : null}
      </div>

      {mode === "create" && onAddBlock ? (
        <div className="flex w-fit flex-wrap items-center gap-2 self-start">
          <label htmlFor={blockCountInputId} className="sr-only">
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
            className={`flex items-center justify-center rounded-lg px-4 py-1.5 text-xs disabled:opacity-50 ${COMPOSITOR_ADD_BLOCK_BUTTON_CLASS}`}
          >
            {COMPOSITOR_LABEL_AGREGAR_BLOQUE}
          </TapButton>
        </div>
      ) : null}
    </div>
  );
}
