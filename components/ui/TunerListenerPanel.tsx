"use client";

import {
  AFINADOR_LADDER_SEMITONE_SPAN,
  afinadorCentsToLadderPercent,
  afinadorSemitoneOffsetToLadderPercent,
  getAfinadorLadderSlots,
  getTunerMarkerColor,
  getTunerStatus,
  type NoteDetection,
  type TunerStatus,
} from "@/lib/afinador";
import { useEffect, useRef, useState } from "react";

/** Oculta la bolita al inicio de cada pulsación (ataque ruidoso del mic). */
const PITCH_MARKER_ONSET_HIDE_MS = 180;
/** La letra grande solo aparece si la misma nota se sostiene este tiempo. */
const DISPLAY_NOTE_HOLD_MS = 280;

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
  const slots = getAfinadorLadderSlots(targetNote);
  const markerLeft = afinadorCentsToLadderPercent(cents);
  const markerColor = getTunerMarkerColor(cents, status !== "silent");
  const intuneWidth =
    (5 / (AFINADOR_LADDER_SEMITONE_SPAN * 100)) * 100;
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
      <div
        className="relative h-28 overflow-hidden rounded-estandar border transition-[border-color,box-shadow] duration-200 ease-out bg-bg-card px-1"
        style={{
          borderColor: status === "in-tune" ? "var(--tuner-in-tune)" : "var(--border)",
          boxShadow: status === "in-tune"
            ? "0 0 16px color-mix(in srgb, var(--tuner-in-tune) 35%, transparent)"
            : undefined,
        }}
      >
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
                left: `${afinadorSemitoneOffsetToLadderPercent(slot.semitoneOffset)}%`,
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

export function TunerListenerPanel({
  detection,
  active = true,
}: {
  detection: NoteDetection | null;
  active?: boolean;
}) {
  const hasSignal = active && detection !== null;
  const status = getTunerStatus(detection?.cents ?? 0, hasSignal);
  const stableDisplayNote = useStableDisplayNote(
    detection?.note ?? null,
    hasSignal,
  );
  const barTargetNote = stableDisplayNote ?? detection?.note ?? "C";

  return (
    <div className="flex w-full flex-col items-center gap-5">
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
    </div>
  );
}
