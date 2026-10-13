"use client";

import CancioneroCardVisual from "@/components/cancionero/CancioneroCardVisual";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionPracticaListItem } from "@/lib/canciones-practica";
import { MoreHorizontal, NotebookPen, Pencil, Speech, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;
const ACTION_FAB_CASCADE_STEP_MS = 55;

type PracticaCancionCardProps = {
  cancion: CancionPracticaListItem;
  artistaAvatarUrl?: string | null;
  isDesktop?: boolean;
  actionsOpen: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onOpen: () => void;
  onEditar: () => void;
  onEliminar: () => void;
};

function Marca({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="flex size-[22px] shrink-0 items-center justify-center rounded-[7px]"
      style={{
        backgroundColor: "var(--accent-entrenador-canciones-dim)",
        color: "color-mix(in srgb, var(--accent-entrenador-canciones) 55%, white)",
      }}
    >
      {children}
    </span>
  );
}

export default function PracticaCancionCard({
  cancion,
  artistaAvatarUrl,
  isDesktop = false,
  actionsOpen,
  onOpenActions,
  onCloseActions,
  onOpen,
  onEditar,
  onEliminar,
}: PracticaCancionCardProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);

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

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;

    setIsPressed(true);
    pointerStartRef.current = { x: event.clientX, y: event.clientY };

    if (isDesktop) return;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setIsPressed(false);
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (
      Math.abs(dx) >= LONG_PRESS_MOVE_CANCEL_PX ||
      Math.abs(dy) >= LONG_PRESS_MOVE_CANCEL_PX
    ) {
      pointerStartRef.current = null;
      clearLongPressTimer();
      setIsPressed(false);
    }
  }

  function handlePointerEnd() {
    pointerStartRef.current = null;
    clearLongPressTimer();
    setIsPressed(false);
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

    onOpen();
  }

  function runAction(action: () => void) {
    onCloseActions();
    action();
  }

  return (
    <article
      style={isPressed ? { transform: "scale(0.97)" } : undefined}
      className={`relative w-full min-w-0 max-w-full cursor-pointer touch-pan-y rounded-estandar border bg-bg-card p-3 select-none transition-transform duration-100 ease-out hover:border-text-faint/50 ${
        actionsOpen
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border-card"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={(event) => {
        if (isDesktop) return;
        event.preventDefault();
        openActions();
      }}
      onClick={handleClick}
    >
      <CancioneroCardVisual
        nombre={cancion.nombre}
        artista={cancion.artista}
        artistaAvatarUrl={artistaAvatarUrl}
        reservarEsquina={isDesktop}
        iconos={
          <>
            {cancion.tiene_compases ? (
              <Marca label="Tiene compases">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                  <ellipse
                    cx="5.5"
                    cy="11.5"
                    rx="2.7"
                    ry="1.85"
                    fill="currentColor"
                    transform="rotate(-22 5.5 11.5)"
                  />
                  <path
                    d="M7.8 10.5V3.1c1.7.9 3.1.7 4.2-.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.45"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Marca>
            ) : null}
            {cancion.tiene_canto ? (
              <Marca label="Tiene anotaciones de canto">
                <Speech className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
              </Marca>
            ) : null}
            {cancion.tiene_nota ? (
              <Marca label="Tiene nota">
                <NotebookPen className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
              </Marca>
            ) : null}
          </>
        }
      />

      {isDesktop ? (
        <TapButton
          type="button"
          aria-label={`Opciones de ${cancion.nombre}`}
          aria-expanded={actionsOpen}
          aria-haspopup="menu"
          title="Opciones"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (actionsOpen) onCloseActions();
            else onOpenActions();
          }}
          className="absolute right-1.5 top-1.5 z-20 flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-white/10 hover:text-text-primary"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </TapButton>
      ) : null}

      {actionsOpen && isDesktop ? (
        <>
          <button
            type="button"
            aria-label="Cerrar opciones"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
            onClick={(event) => {
              event.stopPropagation();
              onCloseActions();
            }}
          />
          <div
            role="menu"
            className="absolute right-1.5 top-10 z-50 w-40 overflow-hidden rounded-xl border border-border bg-bg-dark py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-white/[0.06]"
              onClick={() => runAction(onEditar)}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#d94a3d] hover:bg-white/[0.06]"
              onClick={() => runAction(onEliminar)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Borrar
            </button>
          </div>
        </>
      ) : null}

      {actionsOpen && !isDesktop ? (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
            onClick={(event) => {
              event.stopPropagation();
              onCloseActions();
            }}
          />
          <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-end gap-2">
            <TapButton
              aria-label={`Editar ${cancion.nombre}`}
              onClick={(event) => {
                event.stopPropagation();
                runAction(onEditar);
              }}
              className="cancionero-action-fab-item flex size-12 items-center justify-center rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
              style={{ animationDelay: `${ACTION_FAB_CASCADE_STEP_MS}ms` }}
            >
              <Pencil className="size-5" aria-hidden="true" />
            </TapButton>
            <TapButton
              aria-label={`Eliminar ${cancion.nombre}`}
              onClick={(event) => {
                event.stopPropagation();
                runAction(onEliminar);
              }}
              className="cancionero-action-fab-item flex size-12 items-center justify-center rounded-full bg-[#d94a3d] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </TapButton>
          </div>
        </>
      ) : null}
    </article>
  );
}
