"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  COMPOSITOR_DRUM_PATTERNS,
  type CompositorDrumPatternId,
} from "@/lib/compositor-drum-patterns";
import {
  COMPOSITOR_ARIA_MODAL_RITMOS_BATERIA,
  COMPOSITOR_HELP_RITMOS_BATERIA,
  COMPOSITOR_LABEL_PLANTILLAS,
  COMPOSITOR_LABEL_RITMOS_BATERIA,
} from "@/lib/ritmo-terminologia";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const DRUM_PREVIEW_COLOR = "var(--compositor-block-bateria)";

type CompositorDrumPatternPickerProps = {
  activePatternId: CompositorDrumPatternId | null;
  disabled?: boolean;
  onSelectPattern: (patternId: CompositorDrumPatternId) => void;
};

function DrumPatternMiniPreview({
  patternId,
  events,
  cycleGolpes,
}: {
  patternId: CompositorDrumPatternId;
  events: Array<{ startStep: number; durationSteps: number }>;
  cycleGolpes: number;
}) {
  const gridSteps = cycleGolpes * 4;

  return (
    <div
      className="relative mt-1.5 h-3 overflow-hidden rounded bg-bg-darker"
      aria-hidden="true"
    >
      {events.map((event) => (
        <div
          key={`${patternId}-${event.startStep}`}
          className="absolute inset-y-0 rounded-sm opacity-80"
          style={{
            left: `${(event.startStep / gridSteps) * 100}%`,
            width: `${Math.max((event.durationSteps / gridSteps) * 100, 4)}%`,
            backgroundColor: DRUM_PREVIEW_COLOR,
          }}
        />
      ))}
    </div>
  );
}

function DrumPatternCard({
  pattern,
  isActive,
  disabled,
  onSelect,
}: {
  pattern: (typeof COMPOSITOR_DRUM_PATTERNS)[number];
  isActive: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <TapButton
      type="button"
      role="listitem"
      disabled={disabled}
      aria-pressed={isActive}
      title={pattern.descripcion}
      onClick={onSelect}
      className={`flex flex-col rounded-lg border px-2.5 py-2.5 text-left transition-colors disabled:opacity-50 ${
        isActive
          ? "border-compositor-config bg-compositor-config/10"
          : "border-border bg-bg-dark hover:border-border-strong"
      }`}
    >
      <span
        className={`text-[11px] font-bold leading-tight ${
          isActive ? "text-compositor-config" : "text-text-primary"
        }`}
      >
        {pattern.label}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text-muted">
        {pattern.descripcion}
      </span>
      <DrumPatternMiniPreview
        patternId={pattern.id}
        events={pattern.events}
        cycleGolpes={pattern.cycleGolpes}
      />
    </TapButton>
  );
}

export function CompositorDrumPatternPicker({
  activePatternId,
  disabled = false,
  onSelectPattern,
}: CompositorDrumPatternPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  function handleSelectPattern(patternId: CompositorDrumPatternId) {
    setModalOpen(false);
    onSelectPattern(patternId);
  }

  return (
    <>
      <TapButton
        type="button"
        disabled={disabled}
        onClick={() => setModalOpen(true)}
        aria-haspopup="dialog"
        aria-label={COMPOSITOR_ARIA_MODAL_RITMOS_BATERIA}
        data-compositor-edit-surface=""
        className="flex w-full items-center justify-center rounded-lg border border-border bg-bg-dark px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-border-strong disabled:opacity-50"
      >
        {COMPOSITOR_LABEL_PLANTILLAS}
      </TapButton>

      {modalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-3 pb-10 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/35"
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={COMPOSITOR_ARIA_MODAL_RITMOS_BATERIA}
            className="relative z-10 flex max-h-[min(80vh,40rem)] w-full max-w-sm flex-col rounded-[12px] border border-border bg-bg-card"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {COMPOSITOR_LABEL_RITMOS_BATERIA}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {COMPOSITOR_HELP_RITMOS_BATERIA}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setModalOpen(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-dark text-text-muted hover:text-text-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
              role="list"
              aria-label={COMPOSITOR_ARIA_MODAL_RITMOS_BATERIA}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {COMPOSITOR_DRUM_PATTERNS.map((pattern) => (
                  <DrumPatternCard
                    key={pattern.id}
                    pattern={pattern}
                    isActive={activePatternId === pattern.id}
                    disabled={disabled}
                    onSelect={() => handleSelectPattern(pattern.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
