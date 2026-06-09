"use client";

import {
  centsToNeedleAngle,
  getClosestStringIndex,
  getStatusLabel,
  getTunerStatus,
  GUITAR_STRINGS,
  type NoteDetection,
} from "@/lib/afinador";
import { X } from "lucide-react";

type AfinadorModalProps = {
  open: boolean;
  onClose: () => void;
  detection: NoteDetection | null;
  micError: string | null;
  micReady: boolean;
};

function TunerDial({
  cents,
  status,
}: {
  cents: number;
  status: ReturnType<typeof getTunerStatus>;
}) {
  const needleAngle = centsToNeedleAngle(cents);
  const needleColor =
    status === "in-tune"
      ? "var(--tuner-in-tune)"
      : "var(--tuner-flat-sharp)";

  return (
    <svg
      viewBox="0 0 240 150"
      className="mx-auto w-full max-w-[280px]"
      aria-hidden="true"
    >
      <path
        d="M 24 120 A 96 96 0 0 1 216 120"
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
      />

      <path
        d="M 24 120 A 96 96 0 0 1 96 36"
        fill="none"
        stroke="var(--tuner-flat-sharp)"
        strokeOpacity="0.5"
        strokeWidth="14"
        strokeLinecap="round"
      />

      <path
        d="M 96 36 A 96 96 0 0 1 144 36"
        fill="none"
        stroke="var(--tuner-in-tune)"
        strokeOpacity="0.6"
        strokeWidth="14"
        strokeLinecap="round"
      />

      <path
        d="M 144 36 A 96 96 0 0 1 216 120"
        fill="none"
        stroke="var(--tuner-flat-sharp)"
        strokeOpacity="0.5"
        strokeWidth="14"
        strokeLinecap="round"
      />

      <g transform={`rotate(${needleAngle} 120 120)`}>
        <line
          x1="120"
          y1="120"
          x2="120"
          y2="38"
          stroke={needleColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="120" cy="120" r="8" fill={needleColor} />
      </g>
    </svg>
  );
}

export default function AfinadorModal({
  open,
  onClose,
  detection,
  micError,
  micReady,
}: AfinadorModalProps) {
  const status = getTunerStatus(detection?.cents ?? 0, detection !== null);
  const closestStringIndex = getClosestStringIndex(detection?.frequency ?? null);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-darker">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
            Afinador cromático
          </h2>
          <button
            type="button"
            aria-label="Cerrar afinador"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-5 text-text-primary" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        {micError ? (
          <p className="max-w-sm text-center text-sm text-text-secondary" role="alert">
            {micError}
          </p>
        ) : (
          <>
            <div className="text-center">
              <p
                className="text-[96px] font-extrabold leading-none text-text-primary"
                aria-live="polite"
              >
                {detection?.note ?? "—"}
              </p>
              <p className="mt-2 text-lg text-text-muted">
                {detection ? `${detection.frequency.toFixed(1)} Hz` : "— Hz"}
              </p>
            </div>

            <TunerDial cents={detection?.cents ?? 0} status={status} />

            <p
              className="text-base font-semibold"
              style={{
                color:
                  status === "in-tune"
                    ? "var(--tuner-in-tune)"
                    : status === "silent"
                      ? "var(--text-muted)"
                      : "var(--accent)",
              }}
              aria-live="polite"
            >
              {micReady ? getStatusLabel(status) : "Iniciando micrófono..."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {GUITAR_STRINGS.map((string, index) => {
                const isClosest = closestStringIndex === index;

                return (
                  <span
                    key={string.label}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      isClosest
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-bg-card text-text-secondary"
                    }`}
                  >
                    {string.label}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
