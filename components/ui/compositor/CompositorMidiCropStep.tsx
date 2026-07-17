"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  type CompositorInstrumentId,
} from "@/lib/compositor";
import {
  clampCropWindow,
  cropSelectionHasPreviewNotes,
  formatSongBeatLabel,
  getAvailableLayersForCrop,
  getCropWindowGolpes,
  getLayersWithContentInSong,
  getNoteDensityByBeat,
  MIDI_IMPORT_MAX_CYCLE_GOLPES,
  snapBeat,
  translateCropWindow,
  validateCropSelection,
  type MidiImportFileSession,
} from "@/lib/compositor-midi";
import {
  COMPOSITOR_HELP_CAPA_AUSENTE_ARCHIVO_MIDI,
  COMPOSITOR_HELP_CAPA_AUSENTE_TRAMO_MIDI,
  COMPOSITOR_HELP_RECORTE_MIDI,
  COMPOSITOR_LABEL_CAPAS_CICLO_IMPORT,
  COMPOSITOR_LABEL_CONTINUAR_REVISION_MIDI,
  COMPOSITOR_LABEL_DETENER_RECORTE_MIDI,
  COMPOSITOR_LABEL_ESCUCHAR_RECORTE_MIDI,
  COMPOSITOR_LABEL_GOLPES_RECORTE_CON_LIMITE,
  COMPOSITOR_LABEL_RECORTE_MIDI,
  COMPOSITOR_LABEL_VENTANA_RECORTE_MIDI,
} from "@/lib/ritmo-terminologia";
import { COMPOSITOR_ACTION_BUTTON_CLASS } from "@/lib/compositor-ui";
import { Loader2, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PX_PER_BEAT = 22;

type DragMode = "start" | "end" | "move";

type MoveAnchor = {
  pointerBeat: number;
  startBeat: number;
  endBeat: number;
};

type CompositorMidiCropStepProps = {
  fileSession: MidiImportFileSession;
  busy?: boolean;
  isPreviewing?: boolean;
  previewLoading?: boolean;
  previewProgress?: number | null;
  onSetCropLayers: (layers: CompositorInstrumentId[]) => void;
  onSetCropWindow: (startBeat: number, endBeat: number) => void;
  onPreview: () => void | Promise<void>;
  onStopPreview: () => void;
  onConfirmCrop: () => string | null;
  onCancel: () => void;
};

function beatToPercent(beat: number, totalBeats: number): number {
  if (totalBeats <= 0) {
    return 0;
  }

  return (beat / totalBeats) * 100;
}

export function CompositorMidiCropStep({
  fileSession,
  busy = false,
  isPreviewing = false,
  previewLoading = false,
  previewProgress = null,
  onSetCropLayers,
  onSetCropWindow,
  onPreview,
  onStopPreview,
  onConfirmCrop,
  onCancel,
}: CompositorMidiCropStepProps) {
  const { parsed, crop, beatsPerBar, totalBeats } = fileSession;
  const trackRef = useRef<HTMLDivElement>(null);
  const moveAnchorRef = useRef<MoveAnchor | null>(null);
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const density = useMemo(() => getNoteDensityByBeat(parsed), [parsed]);
  const maxDensity = useMemo(
    () => Math.max(1, ...density),
    [density],
  );
  const availableLayers = useMemo(
    () => getAvailableLayersForCrop(parsed, crop),
    [parsed, crop.startBeat, crop.endBeat],
  );
  const availableLayerSet = useMemo(
    () => new Set(availableLayers),
    [availableLayers],
  );
  const songLayers = useMemo(
    () => getLayersWithContentInSong(parsed),
    [parsed],
  );
  const songLayerSet = useMemo(() => new Set(songLayers), [songLayers]);
  const selectedGolpes = getCropWindowGolpes(crop);
  const validation = validateCropSelection(crop, parsed);
  const canPreview =
    validation.ok && cropSelectionHasPreviewNotes(fileSession);

  const cropSignature = `${crop.startBeat}:${crop.endBeat}:${crop.selectedLayers.join(",")}`;

  useEffect(() => {
    if (isPreviewing) {
      onStopPreview();
    }
    // Detener preview al cambiar ventana o capas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropSignature]);

  const beatFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;

      if (!track) {
        return 0;
      }

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snapBeat(ratio * totalBeats, parsed);
    },
    [parsed, totalBeats],
  );

  const applyEdgeDragAt = useCallback(
    (handle: "start" | "end", beat: number) => {
      const snapped = snapBeat(beat, parsed);
      const clamped = clampCropWindow(
        handle === "start" ? snapped : crop.startBeat,
        handle === "end" ? snapped : crop.endBeat,
        totalBeats,
        handle,
      );
      onSetCropWindow(clamped.startBeat, clamped.endBeat);
    },
    [crop.endBeat, crop.startBeat, onSetCropWindow, parsed, totalBeats],
  );

  const applyMoveDragAt = useCallback(
    (beat: number) => {
      const anchor = moveAnchorRef.current;

      if (!anchor) {
        return;
      }

      const delta =
        snapBeat(beat, parsed) - snapBeat(anchor.pointerBeat, parsed);
      const translated = translateCropWindow(
        anchor.startBeat,
        anchor.endBeat,
        delta,
        totalBeats,
      );
      onSetCropWindow(translated.startBeat, translated.endBeat);
    },
    [onSetCropWindow, parsed, totalBeats],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const activeMode = dragging;

    function handleMove(event: PointerEvent) {
      const beat = beatFromClientX(event.clientX);

      if (activeMode === "move") {
        applyMoveDragAt(beat);
        return;
      }

      applyEdgeDragAt(activeMode, beat);
    }

    function handleUp() {
      moveAnchorRef.current = null;
      setDragging(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [applyEdgeDragAt, applyMoveDragAt, beatFromClientX, dragging]);

  function toggleLayer(layerId: CompositorInstrumentId) {
    if (!availableLayerSet.has(layerId)) {
      return;
    }

    const isSelected = crop.selectedLayers.includes(layerId);

    if (isSelected && crop.selectedLayers.length <= 1) {
      return;
    }

    const next = isSelected
      ? crop.selectedLayers.filter((entry) => entry !== layerId)
      : [...crop.selectedLayers, layerId];

    onSetCropLayers(next);
    setSubmitError(null);
  }

  function handleConfirm() {
    setSubmitError(null);

    const message = onConfirmCrop();

    if (message) {
      setSubmitError(message);
    }
  }

  function handlePreviewClick() {
    if (isPreviewing) {
      onStopPreview();
      return;
    }

    void onPreview();
  }

  function beginMoveDrag(clientX: number) {
    moveAnchorRef.current = {
      pointerBeat: beatFromClientX(clientX),
      startBeat: crop.startBeat,
      endBeat: crop.endBeat,
    };
    setDragging("move");
  }

  const startPercent = beatToPercent(crop.startBeat, totalBeats);
  const endPercent = beatToPercent(crop.endBeat, totalBeats);
  const trackWidth = Math.max(totalBeats * PX_PER_BEAT, 280);
  const selectionWidth = Math.max(endPercent - startPercent, 0.5);
  const selectionCenterPercent = startPercent + selectionWidth / 2;
  const playheadPercent =
    isPreviewing && previewProgress != null
      ? startPercent + selectionWidth * Math.max(0, Math.min(1, previewProgress))
      : null;

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-compositor-config/30 bg-compositor-config/8 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_RECORTE_MIDI}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
          {fileSession.fileName}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">
          {parsed.bpm} BPM · {beatsPerBar} golpes por compás ·{" "}
          {COMPOSITOR_LABEL_GOLPES_RECORTE_CON_LIMITE(
            selectedGolpes,
            MIDI_IMPORT_MAX_CYCLE_GOLPES,
          )}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">
          {COMPOSITOR_HELP_RECORTE_MIDI}
        </p>
        {fileSession.saveNotice ? (
          <p className="mt-2 text-[11px] font-semibold text-[var(--tuner-cerca)]">
            {fileSession.saveNotice}
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_CAPAS_CICLO_IMPORT}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
            const inSong = songLayerSet.has(option.id);
            const inWindow = availableLayerSet.has(option.id);
            const isAvailable = inWindow;
            const active = crop.selectedLayers.includes(option.id);
            const absenceHint = !inSong
              ? COMPOSITOR_HELP_CAPA_AUSENTE_ARCHIVO_MIDI
              : !inWindow
                ? COMPOSITOR_HELP_CAPA_AUSENTE_TRAMO_MIDI
                : null;

            return (
              <div key={option.id} className="flex min-w-0 flex-col gap-1">
                <TapButton
                  type="button"
                  disabled={busy || !isAvailable}
                  onClick={() => toggleLayer(option.id)}
                  className={`w-full rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-40 ${
                    !isAvailable
                      ? "cursor-not-allowed bg-bg-dark/50 text-text-muted/50"
                      : active
                        ? "bg-compositor-config/20 text-compositor-config"
                        : "bg-bg-dark text-text-muted"
                  }`}
                >
                  {option.label}
                </TapButton>
                {absenceHint ? (
                  <p
                    className={`px-1 text-center text-[9px] leading-snug ${
                      !inSong
                        ? "text-text-muted/80"
                        : "text-text-muted/65"
                    }`}
                  >
                    {absenceHint}
                  </p>
                ) : (
                  <span className="block min-h-[1.375rem]" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_VENTANA_RECORTE_MIDI}
        </p>

        <div className="overflow-x-auto overflow-y-visible rounded-[10px] border border-border bg-bg-card px-2 pb-2 pt-2">
          <div className="relative pt-9" style={{ width: trackWidth }}>
            <TapButton
              type="button"
              disabled={busy || previewLoading || !canPreview}
              onClick={handlePreviewClick}
              title={COMPOSITOR_LABEL_ESCUCHAR_RECORTE_MIDI}
              className="absolute top-0 z-30 inline-flex min-h-8 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-compositor-config/35 bg-bg-card px-3 text-[11px] font-bold text-compositor-config shadow-md disabled:opacity-40"
              style={{ left: `${selectionCenterPercent}%` }}
            >
              {previewLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : isPreviewing ? (
                <Square className="size-3.5" aria-hidden="true" />
              ) : null}
              {isPreviewing
                ? COMPOSITOR_LABEL_DETENER_RECORTE_MIDI
                : COMPOSITOR_LABEL_ESCUCHAR_RECORTE_MIDI}
            </TapButton>

            <div
              ref={trackRef}
              className="relative h-24 touch-none select-none"
              style={{ width: trackWidth }}
            >
            <div className="absolute inset-x-0 bottom-0 flex h-16 items-end gap-px">
              {density.map((count, beat) => {
                const height = Math.max(8, (count / maxDensity) * 100);
                const isBarStart = beat % beatsPerBar === 0;

                return (
                  <div
                    key={beat}
                    className={`flex-1 min-w-0 rounded-t-sm ${
                      isBarStart ? "bg-text-muted/35" : "bg-text-muted/15"
                    }`}
                    style={{ height: `${height}%` }}
                    title={formatSongBeatLabel(beat, beatsPerBar)}
                  />
                );
              })}
            </div>

            <button
              type="button"
              disabled={busy}
              aria-label="Mover selección"
              onPointerDown={(event) => {
                event.preventDefault();
                beginMoveDrag(event.clientX);
              }}
              className={`absolute inset-y-0 z-[5] rounded-md bg-compositor-config/15 ring-1 ring-compositor-config/40 disabled:opacity-40 ${
                dragging === "move" ? "cursor-grabbing" : "cursor-grab"
              } ${
                selectedGolpes >= MIDI_IMPORT_MAX_CYCLE_GOLPES
                  ? "ring-2 ring-compositor-config/60"
                  : ""
              }`}
              style={{
                left: `${startPercent}%`,
                width: `${selectionWidth}%`,
              }}
            />

            {playheadPercent != null ? (
              <div
                className="pointer-events-none absolute inset-y-1 z-20 w-0.5 -translate-x-1/2 bg-compositor-config shadow-[0_0_6px_var(--compositor-config)]"
                style={{ left: `${playheadPercent}%` }}
                aria-hidden="true"
              />
            ) : null}

            <button
              type="button"
              disabled={busy}
              aria-label={`Inicio: ${formatSongBeatLabel(crop.startBeat, beatsPerBar)}`}
              onPointerDown={(event) => {
                event.preventDefault();
                setDragging("start");
              }}
              className="absolute top-1/2 z-10 h-10 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-compositor-config bg-bg-card shadow disabled:opacity-40"
              style={{ left: `${startPercent}%` }}
            />

            <button
              type="button"
              disabled={busy}
              aria-label={`Fin: ${formatSongBeatLabel(crop.endBeat, beatsPerBar)}`}
              onPointerDown={(event) => {
                event.preventDefault();
                setDragging("end");
              }}
              className="absolute top-1/2 z-10 h-10 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-compositor-config bg-bg-card shadow disabled:opacity-40"
              style={{ left: `${endPercent}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] text-text-muted">
            <span>
              Inicio: {formatSongBeatLabel(crop.startBeat, beatsPerBar)}
            </span>
            <span>Fin: {formatSongBeatLabel(crop.endBeat, beatsPerBar)}</span>
          </div>
          </div>
        </div>

        {!validation.ok ? (
          <p className="mt-2 text-[11px] text-[var(--tuner-lejos)]">
            {validation.message}
          </p>
        ) : null}

        {submitError ? (
          <p className="mt-2 text-[11px] font-semibold text-[var(--tuner-lejos)]">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <TapButton
          type="button"
          disabled={
            busy || !validation.ok || crop.selectedLayers.length === 0
          }
          onClick={handleConfirm}
          className={`rounded-full px-4 py-2 text-xs disabled:opacity-40 ${COMPOSITOR_ACTION_BUTTON_CLASS}`}
        >
          {COMPOSITOR_LABEL_CONTINUAR_REVISION_MIDI}
        </TapButton>
        <TapButton
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-full border border-border bg-bg-darker px-4 py-2 text-xs font-bold text-text-muted disabled:opacity-40"
        >
          Cancelar importación
        </TapButton>
      </div>
    </div>
  );
}
