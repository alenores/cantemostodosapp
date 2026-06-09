"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { Bookmark, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";

const LONG_PRESS_MS = 500;

type CancioneroItemCardProps = {
  cancion: CancionCancionero;
  actionsOpen: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onVer: (cancion: CancionCancionero) => void;
  onEditar: (cancion: CancionCancionero) => void;
  onEliminar: (cancion: CancionCancionero) => void;
};

export default function CancioneroItemCard({
  cancion,
  actionsOpen,
  onOpenActions,
  onCloseActions,
  onVer,
  onEditar,
  onEliminar,
}: CancioneroItemCardProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openActions() {
    triggerHaptic();
    suppressClickRef.current = true;
    onOpenActions();
  }

  function handlePointerDown() {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerEnd() {
    clearLongPressTimer();
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (actionsOpen) {
      onCloseActions();
      return;
    }

    onVer(cancion);
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    openActions();
  }

  function runAction(action: () => void) {
    onCloseActions();
    action();
  }

  return (
    <article
      className={`relative cursor-pointer rounded-[12px] border bg-bg-card px-4 py-3 select-none ${
        actionsOpen
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border"
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Bookmark
          className="size-5 shrink-0"
          style={{ color: "var(--tuner-in-tune)" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-text-primary">
            {cancion.nombre}
          </p>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
      </div>

      {actionsOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            className="fixed inset-0 z-40"
            onClick={onCloseActions}
          />
          <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
            <TapButton
              aria-label={`Editar ${cancion.nombre}`}
              onClick={(event) => {
                event.stopPropagation();
                runAction(() => onEditar(cancion));
              }}
              className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
            >
              <Pencil className="size-5" aria-hidden="true" />
            </TapButton>

            <TapButton
              aria-label={`Eliminar ${cancion.nombre}`}
              onClick={(event) => {
                event.stopPropagation();
                runAction(() => onEliminar(cancion));
              }}
              className="flex size-12 items-center justify-center rounded-full bg-[#d94a3d] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </TapButton>
          </div>
        </>
      )}
    </article>
  );
}
