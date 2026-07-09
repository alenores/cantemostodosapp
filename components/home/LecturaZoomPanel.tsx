"use client";

import LetraZoomControl from "@/components/home/LetraZoomControl";
import { TapButton } from "@/components/ui/TapFeedback";
import type { LetraZoomLevel } from "@/lib/letra-zoom";

type LecturaZoomPanelProps = {
  open: boolean;
  level: LetraZoomLevel;
  enabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onClose: () => void;
};

export default function LecturaZoomPanel({
  open,
  level,
  enabled = true,
  onDecrease,
  onIncrease,
  onClose,
}: LecturaZoomPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[50] cursor-default bg-black/40 lg:hidden"
        aria-label="Cerrar tamaño de letra"
        onClick={onClose}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[51] flex items-center justify-center p-6 lg:hidden"
        role="dialog"
        aria-label="Tamaño de letra"
      >
        <div className="pointer-events-auto flex w-full max-w-[15rem] flex-col items-stretch gap-3 rounded-2xl border border-border/50 bg-bg-dark/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p className="text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Tamaño de letra
          </p>

          <div className="self-center">
            <LetraZoomControl
              level={level}
              enabled={enabled}
              onDecrease={onDecrease}
              onIncrease={onIncrease}
            />
          </div>

          <TapButton
            type="button"
            onClick={onClose}
            className="rounded-xl border border-accent/50 bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Listo
          </TapButton>
        </div>
      </div>
    </>
  );
}
