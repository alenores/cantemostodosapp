"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { useDrag } from "@use-gesture/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

const SWIPE_THRESHOLD_PX = 50;

type CancioneroVerModalProps = {
  open: boolean;
  cancion: CancionCancionero | null;
  onClose: () => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  tieneAnterior?: boolean;
  tieneSiguiente?: boolean;
};

export default function CancioneroVerModal({
  open,
  cancion,
  onClose,
  onAnterior,
  onSiguiente,
  tieneAnterior = false,
  tieneSiguiente = false,
}: CancioneroVerModalProps) {
  const letraScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    letraScrollRef.current?.scrollTo(0, 0);
  }, [cancion?.id]);

  const bindHeaderSwipe = useDrag(
    ({ movement: [mx], last }) => {
      if (!last || Math.abs(mx) < SWIPE_THRESHOLD_PX) {
        return;
      }

      if (mx < 0 && tieneAnterior) {
        triggerHaptic();
        onAnterior?.();
      } else if (mx > 0 && tieneSiguiente) {
        triggerHaptic();
        onSiguiente?.();
      }
    },
    { axis: "x", filterTaps: true },
  );

  if (!open || !cancion) {
    return null;
  }

  const tieneLetra = Boolean(cancion.letra?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar canción"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancionero-ver-titulo"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header
          {...bindHeaderSwipe()}
          className="shrink-0 touch-pan-y border-b border-border bg-bg-dark px-4 py-3"
          aria-label="Deslizá a la izquierda o derecha para cambiar de canción"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 select-none">
              <h2
                id="cancionero-ver-titulo"
                className="text-lg font-extrabold text-accent"
              >
                {cancion.nombre}
              </h2>
              {cancion.artista && (
                <p className="mt-0.5 truncate text-sm text-text-muted">
                  {cancion.artista}
                </p>
              )}
            </div>
            <TapButton
              aria-label="Cerrar"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </TapButton>
          </div>
        </header>

        <div
          ref={letraScrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          {tieneLetra ? (
            <LetraTexto texto={cancion.letra!} />
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">
              Esta canción no tiene letra guardada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
