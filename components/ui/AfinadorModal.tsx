"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  getTunerStatus,
  type NoteDetection,
  type TunerStatus,
} from "@/lib/afinador";
import {
  centsToLadderPercent,
  getLadderNoteSlots,
  semitoneOffsetToLadderPercent,
} from "@/lib/voz";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Oculta la bolita al inicio de cada pulsación (ataque ruidoso del mic). */
const PITCH_MARKER_ONSET_HIDE_MS = 180;
/** La letra grande solo aparece si la misma nota se sostiene este tiempo. */
const DISPLAY_NOTE_HOLD_MS = 280;

type AfinadorModalProps = {
  open: boolean;
  onClose: () => void;
  onRequestMic: () => void;
  detection: NoteDetection | null;
  micError: string | null;
  micPermissionGranted: boolean;
  micReady: boolean;
  micStarting: boolean;
};

function useStableDisplayNote(
  candidateNote: string | null,
  hasSignal: boolean,
): string | null {
  const [displayNote, setDisplayNote] = useState<string | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingNoteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasSignal || candidateNote === null) {
      trackingNoteRef.current = null;
      setDisplayNote(null);

      if (holdTimeoutRef.current !== null) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      return;
    }

    if (candidateNote === trackingNoteRef.current) {
      return;
    }

    trackingNoteRef.current = candidateNote;
    setDisplayNote(null);

    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
    }

    holdTimeoutRef.current = setTimeout(() => {
      if (trackingNoteRef.current === candidateNote) {
        setDisplayNote(candidateNote);
      }
      holdTimeoutRef.current = null;
    }, DISPLAY_NOTE_HOLD_MS);

    return () => {
      if (holdTimeoutRef.current !== null) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    };
  }, [candidateNote, hasSignal]);

  return displayNote;
}

function TunerPitchBar({
  targetNote,
  cents,
  status,
  detectedNote,
}: {
  targetNote: string;
  cents: number;
  status: TunerStatus;
  detectedNote: string | null;
}) {
  const [showMarker, setShowMarker] = useState(false);
  const wasSilentRef = useRef(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slots = getLadderNoteSlots(targetNote);
  const markerLeft = centsToLadderPercent(cents);
  const markerColor =
    status === "in-tune"
      ? "var(--tuner-in-tune)"
      : status === "silent"
        ? "var(--text-muted)"
        : "var(--tuner-flat-sharp)";
  const intuneWidth = (15 / (6 * 100)) * 100;
  const hasSignal = status !== "silent";

  useEffect(() => {
    if (!hasSignal) {
      wasSilentRef.current = true;
      setShowMarker(false);

      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      return;
    }

    if (wasSilentRef.current) {
      wasSilentRef.current = false;
      setShowMarker(false);

      hideTimeoutRef.current = setTimeout(() => {
        setShowMarker(true);
        hideTimeoutRef.current = null;
      }, PITCH_MARKER_ONSET_HIDE_MS);
    }

    return () => {
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [hasSignal]);

  return (
    <div className="w-full max-w-sm">
      <div className="relative h-28 overflow-hidden rounded-[12px] border border-border bg-bg-card px-1">
        <div
          className="pointer-events-none absolute inset-y-2 rounded-md"
          style={{
            left: "50%",
            width: `${intuneWidth}%`,
            transform: "translateX(-50%)",
            backgroundColor: "var(--tuner-in-tune)",
            opacity: 0.15,
          }}
          aria-hidden="true"
        />

        {slots.map((slot) => {
          const isTarget = slot.semitoneOffset === 0;
          const isDetected =
            detectedNote !== null && slot.note === detectedNote;

          return (
            <span
              key={`${slot.note}-${slot.semitoneOffset}`}
              className={`pointer-events-none absolute top-2 -translate-x-1/2 text-[10px] font-bold leading-none ${
                isTarget || isDetected
                  ? "text-text-primary"
                  : "text-text-muted"
              }`}
              style={{
                left: `${semitoneOffsetToLadderPercent(slot.semitoneOffset)}%`,
                fontSize: isTarget ? "12px" : "10px",
              }}
            >
              {slot.note}
            </span>
          );
        })}

        {hasSignal && showMarker ? (
          <span
            className="pointer-events-none absolute bottom-1.5 size-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg-card"
            style={{
              left: `${markerLeft}%`,
              backgroundColor: markerColor,
            }}
            aria-hidden="true"
          />
        ) : null}

        <div
          className="pointer-events-none absolute bottom-0 top-0 w-px -translate-x-1/2 bg-border"
          style={{ left: "50%" }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-text-muted">
        <span>Más bajo</span>
        <span>En nota</span>
        <span>Más alto</span>
      </div>
    </div>
  );
}

function MicConnectingPanel() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Conectando micrófono...</p>
    </div>
  );
}

function MicPermissionPanel({
  micError,
  micStarting,
  onRequestMic,
}: {
  micError: string | null;
  micStarting: boolean;
  onRequestMic: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold text-text-primary">
          Acceso al micrófono
        </p>
        <p className="text-sm text-text-muted">
          Para detectar la nota, necesitamos escuchar tu instrumento. Tocá el
          botón y aceptá el permiso cuando el navegador te lo pida.
        </p>
      </div>
      {micError ? (
        <p className="text-sm text-accent" role="alert">
          {micError}
        </p>
      ) : null}
      <TapButton
        type="button"
        disabled={micStarting}
        onClick={onRequestMic}
        className="w-full rounded-[12px] bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {micStarting
          ? "Solicitando permiso..."
          : micError
            ? "Reintentar"
            : "Permitir micrófono"}
      </TapButton>
    </div>
  );
}

export default function AfinadorModal({
  open,
  onClose,
  onRequestMic,
  detection,
  micError,
  micPermissionGranted,
  micReady,
  micStarting,
}: AfinadorModalProps) {
  const hasSignal = detection !== null;
  const status = getTunerStatus(detection?.cents ?? 0, hasSignal);
  const stableDisplayNote = useStableDisplayNote(
    detection?.note ?? null,
    hasSignal,
  );
  const barTargetNote = stableDisplayNote ?? detection?.note ?? "C";

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar afinador"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="afinador-titulo"
        className="relative z-10 tool-modal-panel flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="afinador-titulo"
          title="Afinador"
          closeAriaLabel="Cerrar afinador"
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-6">
          {!micReady ? (
            !micPermissionGranted || micError ? (
              <MicPermissionPanel
                micError={micError}
                micStarting={micStarting}
                onRequestMic={onRequestMic}
              />
            ) : (
              <MicConnectingPanel />
            )
          ) : (
            <>
              <div className="text-center">
                <p
                  className="text-[96px] font-extrabold leading-none text-text-primary"
                  aria-live="polite"
                >
                  {stableDisplayNote ?? "—"}
                </p>
                <p className="mt-2 text-lg text-text-muted">
                  {detection ? `${detection.frequency.toFixed(1)} Hz` : "— Hz"}
                </p>
              </div>

              <TunerPitchBar
                targetNote={barTargetNote}
                cents={detection?.cents ?? 0}
                status={status}
                detectedNote={stableDisplayNote}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
