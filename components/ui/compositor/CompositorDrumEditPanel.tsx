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
  COMPOSITOR_LABEL_CREAR_BLOQUE,
  COMPOSITOR_LABEL_EDITAR_BLOQUE,
  RITMO_LABEL_INTENSIDAD,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import { METRONOME_BEAT_LEVELS, getBeatLevelLabel } from "@/lib/metronomo";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { GripHorizontal } from "lucide-react";

type CompositorDrumEditPanelProps = {
  draft: CompositorDrumDraft;
  mode: "create" | "edit";
  disabled?: boolean;
  onDraftChange: (draft: CompositorDrumDraft) => void;
  onExitEdit?: () => void;
  onPointerDownDrag?: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

function DrumFieldGroup({
  label,
  mode,
  children,
}: {
  label: string;
  mode: "create" | "edit";
  children: React.ReactNode;
}) {
  return (
    <div className={compositorBlockFieldGroupClass(mode)}>
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

export function CompositorDrumEditPanel({
  draft,
  mode,
  disabled = false,
  onDraftChange,
  onExitEdit,
  onPointerDownDrag,
}: CompositorDrumEditPanelProps) {
  return (
    <div
      data-compositor-edit-surface=""
      className="space-y-2.5 rounded-lg border border-compositor-config/15 bg-[color-mix(in_srgb,var(--compositor-config)_5%,var(--bg-card))] px-2.5 py-2.5 lg:px-3 lg:py-3"
    >
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
        <DrumFieldGroup label={RITMO_LABEL_TIMBRE} mode={mode}>
          <CompositorDesktopDrumSoundGrid
            value={draft.drumSound}
            disabled={disabled}
            mode={mode}
            onChange={(sound) => onDraftChange({ ...draft, drumSound: sound })}
          />
        </DrumFieldGroup>

        <DrumFieldGroup label={RITMO_LABEL_INTENSIDAD} mode={mode}>
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
