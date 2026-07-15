"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  getPatternsByFamilia,
  type CompositorMelodicPattern,
  type CompositorMelodicPatternId,
} from "@/lib/compositor-melodic-patterns";
import type { CompositorMelodicInstrumentId } from "@/lib/compositor";
import {
  COMPOSITOR_ARIA_DETENER_PREVIEW_MELODIA,
  COMPOSITOR_ARIA_MODAL_MELODIAS,
  COMPOSITOR_ARIA_PREVIEW_MELODIA,
  COMPOSITOR_HELP_ACOMPANAMIENTO_PLANTILLA,
  COMPOSITOR_HELP_MELODIAS_PLANTILLA,
  COMPOSITOR_LABEL_ACOMPANAMIENTO_PLANTILLA,
  COMPOSITOR_LABEL_MELODIAS_PLANTILLA,
  COMPOSITOR_LABEL_PLANTILLAS,
} from "@/lib/ritmo-terminologia";
import { Play, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MELODIC_PREVIEW_COLOR = "var(--compositor-block-piano)";
const ACOMP_PREVIEW_COLOR = "var(--compositor-block-guitarra)";
const MELODIC_PREVIEW_PLAYHEAD_COLOR = "var(--compositor-config)";

type CompositorMelodicPatternPickerProps = {
  instrumentId: CompositorMelodicInstrumentId;
  activePatternId: CompositorMelodicPatternId | null;
  previewingPatternId: CompositorMelodicPatternId | null;
  previewProgress: number | null;
  disabled?: boolean;
  onSelectPattern: (patternId: CompositorMelodicPatternId) => void;
  onPreviewPattern: (patternId: CompositorMelodicPatternId) => void;
  onStopPreview: () => void;
};

function MelodicPatternMiniPreview({
  patternId,
  events,
  cycleGolpes,
  playheadProgress,
  color,
}: {
  patternId: CompositorMelodicPatternId;
  events: Array<{
    startStep: number;
    durationSteps: number;
    guitarArticulation?: string;
    guitarString?: number | null;
  }>;
  cycleGolpes: number;
  playheadProgress: number | null;
  color: string;
}) {
  const gridSteps = cycleGolpes * 4;
  const showsGuitarMotion = events.some(
    (event) =>
      event.guitarString != null ||
      event.guitarArticulation === "rasguido" ||
      event.guitarArticulation === "rasguidoArriba",
  );

  return (
    <div
      className={`relative mt-1.5 overflow-hidden rounded bg-bg-darker ${
        showsGuitarMotion ? "h-6" : "h-3"
      }`}
      aria-hidden="true"
    >
      {events.map((event, index) => (
        <div
          key={`${patternId}-${event.startStep}-${index}`}
          className={`absolute bottom-0 rounded-sm opacity-80 ${
            showsGuitarMotion ? "h-2" : "inset-y-0"
          }`}
          style={{
            left: `${(event.startStep / gridSteps) * 100}%`,
            width: `${Math.max((event.durationSteps / gridSteps) * 100, 4)}%`,
            backgroundColor: color,
          }}
        />
      ))}
      {showsGuitarMotion
        ? events.map((event, index) => {
            const motion =
              event.guitarString != null
                ? event.guitarString === 6
                  ? "B"
                  : String(event.guitarString)
                : event.guitarArticulation === "rasguidoArriba"
                  ? "↑"
                  : "↓";
            return (
              <span
                key={`motion-${patternId}-${event.startStep}-${index}`}
                className="absolute top-0.5 -translate-x-1/2 text-[9px] font-black leading-none text-text-secondary"
                style={{ left: `${((event.startStep + 0.5) / gridSteps) * 100}%` }}
              >
                {motion}
              </span>
            );
          })
        : null}
      {playheadProgress != null ? (
        <div
          className="absolute inset-y-0 w-0.5 rounded-full"
          style={{
            left: `${playheadProgress * 100}%`,
            backgroundColor: MELODIC_PREVIEW_PLAYHEAD_COLOR,
          }}
        />
      ) : null}
    </div>
  );
}

function MelodicPatternCard({
  pattern,
  isActive,
  isPreviewing,
  previewProgress,
  disabled,
  previewColor,
  onSelect,
  onPreview,
}: {
  pattern: CompositorMelodicPattern;
  isActive: boolean;
  isPreviewing: boolean;
  previewProgress: number | null;
  disabled: boolean;
  previewColor: string;
  onSelect: () => void;
  onPreview: () => void;
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
          : isPreviewing
            ? "border-compositor-config/60 bg-compositor-config/5"
            : "border-border bg-bg-dark hover:border-border-strong"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[11px] font-bold leading-tight ${
            isActive || isPreviewing
              ? "text-compositor-config"
              : "text-text-primary"
          }`}
        >
          {pattern.label}
        </span>
        <button
          type="button"
          disabled={disabled}
          aria-label={
            isPreviewing
              ? COMPOSITOR_ARIA_DETENER_PREVIEW_MELODIA(pattern.label)
              : COMPOSITOR_ARIA_PREVIEW_MELODIA(pattern.label)
          }
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
            isPreviewing
              ? "border-compositor-config bg-compositor-config/15 text-compositor-config"
              : "border-border bg-bg-card text-text-muted hover:border-border-strong hover:text-text-primary"
          }`}
        >
          {isPreviewing ? (
            <Square className="size-2.5 fill-current" aria-hidden="true" />
          ) : (
            <Play className="size-2.5 fill-current" aria-hidden="true" />
          )}
        </button>
      </div>
      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text-muted">
        {pattern.descripcion}
      </span>
      <MelodicPatternMiniPreview
        patternId={pattern.id}
        events={pattern.events}
        cycleGolpes={pattern.cycleGolpes}
        playheadProgress={isPreviewing ? previewProgress : null}
        color={previewColor}
      />
    </TapButton>
  );
}

function PatternSection({
  title,
  help,
  patterns,
  activePatternId,
  previewingPatternId,
  previewProgress,
  disabled,
  previewColor,
  onSelect,
  onPreview,
}: {
  title: string;
  help?: string;
  patterns: CompositorMelodicPattern[];
  activePatternId: CompositorMelodicPatternId | null;
  previewingPatternId: CompositorMelodicPatternId | null;
  previewProgress: number | null;
  disabled: boolean;
  previewColor: string;
  onSelect: (patternId: CompositorMelodicPatternId) => void;
  onPreview: (patternId: CompositorMelodicPatternId) => void;
}) {
  if (patterns.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-compositor-config">
          {title}
        </p>
        {help ? (
          <p className="mt-0.5 text-[10px] leading-snug text-text-muted">{help}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {patterns.map((pattern) => (
          <MelodicPatternCard
            key={pattern.id}
            pattern={pattern}
            isActive={activePatternId === pattern.id}
            isPreviewing={previewingPatternId === pattern.id}
            previewProgress={
              previewingPatternId === pattern.id ? previewProgress : null
            }
            disabled={disabled}
            previewColor={previewColor}
            onSelect={() => onSelect(pattern.id)}
            onPreview={() => onPreview(pattern.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function CompositorMelodicPatternPicker({
  instrumentId,
  activePatternId,
  previewingPatternId,
  previewProgress,
  disabled = false,
  onSelectPattern,
  onPreviewPattern,
  onStopPreview,
}: CompositorMelodicPatternPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const melodias = useMemo(
    () => getPatternsByFamilia(instrumentId, "melodia"),
    [instrumentId],
  );
  const acompanamientos = useMemo(
    () => getPatternsByFamilia(instrumentId, "acompanamiento"),
    [instrumentId],
  );

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

  useEffect(() => {
    if (!modalOpen && previewingPatternId) {
      onStopPreview();
    }
  }, [modalOpen, onStopPreview, previewingPatternId]);

  function handleSelectPattern(patternId: CompositorMelodicPatternId) {
    onStopPreview();
    setModalOpen(false);
    onSelectPattern(patternId);
  }

  function handlePreviewPattern(patternId: CompositorMelodicPatternId) {
    onPreviewPattern(patternId);
  }

  return (
    <>
      <TapButton
        type="button"
        disabled={disabled}
        onClick={() => setModalOpen(true)}
        aria-haspopup="dialog"
        aria-label={COMPOSITOR_ARIA_MODAL_MELODIAS}
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
            aria-label={COMPOSITOR_ARIA_MODAL_MELODIAS}
            className="relative z-10 flex max-h-[min(85vh,44rem)] w-full max-w-lg flex-col rounded-[12px] border border-border bg-bg-card"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/80 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {COMPOSITOR_LABEL_PLANTILLAS}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {COMPOSITOR_HELP_MELODIAS_PLANTILLA}
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
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3"
              role="list"
              aria-label={COMPOSITOR_ARIA_MODAL_MELODIAS}
            >
              <PatternSection
                title={COMPOSITOR_LABEL_MELODIAS_PLANTILLA}
                patterns={melodias}
                activePatternId={activePatternId}
                previewingPatternId={previewingPatternId}
                previewProgress={previewProgress}
                disabled={disabled}
                previewColor={MELODIC_PREVIEW_COLOR}
                onSelect={handleSelectPattern}
                onPreview={handlePreviewPattern}
              />
              <PatternSection
                title={COMPOSITOR_LABEL_ACOMPANAMIENTO_PLANTILLA}
                help={COMPOSITOR_HELP_ACOMPANAMIENTO_PLANTILLA}
                patterns={acompanamientos}
                activePatternId={activePatternId}
                previewingPatternId={previewingPatternId}
                previewProgress={previewProgress}
                disabled={disabled}
                previewColor={ACOMP_PREVIEW_COLOR}
                onSelect={handleSelectPattern}
                onPreview={handlePreviewPattern}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
