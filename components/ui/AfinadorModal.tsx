"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  centsToNeedleAngle,
  getClosestStringIndex,
  getStatusLabel,
  getTunerStatus,
  GUITAR_STRINGS,
  type NoteDetection,
} from "@/lib/afinador";
import { Mic, X } from "lucide-react";

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
  const status = getTunerStatus(detection?.cents ?? 0, detection !== null);
  const closestStringIndex = getClosestStringIndex(detection?.frequency ?? null);

  if (!open) {
    return null;
  }

  return (
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
          <div className="flex items-center gap-3">
            <h2
              id="afinador-titulo"
              className="min-w-0 flex-1 text-lg font-extrabold text-accent"
            >
              Afinador
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

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6">
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
                  {detection?.note ?? "—"}
                </p>
                <p className="mt-2 text-lg text-text-muted">
                  {detection ? `${detection.frequency.toFixed(1)} Hz` : "— Hz"}
                </p>
              </div>

              <TunerDial cents={detection?.cents ?? 0} status={status} />

              <p
                className={`text-base font-semibold ${status === "silent" ? "italic" : ""}`}
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
                {getStatusLabel(status)}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {GUITAR_STRINGS.map((string, index) => {
                  const isClosest = closestStringIndex === index;

                  return (
                    <span
                      key={index}
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
    </div>
  );
}
