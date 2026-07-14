"use client";

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
import {
  COMPOSITOR_LABEL_ARRASTRAR_GRAFICO,
  COMPOSITOR_LABEL_BLOQUES_SELECCIONADOS,
  COMPOSITOR_LABEL_CREAR_BLOQUE,
  COMPOSITOR_LABEL_EDITAR_BLOQUE,
  RITMO_LABEL_INTENSIDAD,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { METRONOME_BEAT_LEVELS, getBeatLevelLabel } from "@/lib/metronomo";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { GripHorizontal } from "lucide-react";

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
  onPointerDownDrag?: (event: React.PointerEvent<HTMLButtonElement>) => void;
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
  onPointerDownDrag,
}: CompositorDrumEditPanelProps) {
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

      {mode === "create" && onPointerDownDrag ? (
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
