"use client";

import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import { COLA_AVISO_EXIT_MS } from "@/lib/sala-layout";
import type { CancionCancionero } from "@/types";
import { Bookmark, Pencil, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;
const ACTION_FAB_CASCADE_STEP_MS = 55;
const ACTION_FAB_ANIM_MS = 220;
const SUMAR_FAB_LABEL = "Guardar en Mis canciones";
const SUMAR_FAB_LABEL_VISIBLE_MS = 2000;

type CancioneroItemCardProps = {
  cancion: CancionCancionero;
  mutationsEnabled?: boolean;
  mostrarSumarMisCanciones?: boolean;
  modoSeleccion?: boolean;
  actionsOpen: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onVer: (cancion: CancionCancionero) => void;
  onSumarAMisCanciones?: (cancion: CancionCancionero) => void;
  onEditar: (cancion: CancionCancionero) => void;
  onEliminar: (cancion: CancionCancionero) => void;
};

export default function CancioneroItemCard({
  cancion,
  mutationsEnabled = true,
  mostrarSumarMisCanciones = false,
  modoSeleccion = false,
  actionsOpen,
  onOpenActions,
  onCloseActions,
  onVer,
  onSumarAMisCanciones,
  onEditar,
  onEliminar,
}: CancioneroItemCardProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sumarLabelShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sumarLabelHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sumarLabelClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [sumarLabelVisible, setSumarLabelVisible] = useState(false);
  const [sumarLabelExiting, setSumarLabelExiting] = useState(false);

  const longPressEnabled =
    mutationsEnabled && (mostrarSumarMisCanciones || mutationsEnabled);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      if (sumarLabelShowTimerRef.current) {
        clearTimeout(sumarLabelShowTimerRef.current);
      }

      if (sumarLabelHideTimerRef.current) {
        clearTimeout(sumarLabelHideTimerRef.current);
      }

      if (sumarLabelClearTimerRef.current) {
        clearTimeout(sumarLabelClearTimerRef.current);
      }
    };
  }, []);

  function clearSumarLabelTimers() {
    if (sumarLabelShowTimerRef.current) {
      clearTimeout(sumarLabelShowTimerRef.current);
      sumarLabelShowTimerRef.current = null;
    }

    if (sumarLabelHideTimerRef.current) {
      clearTimeout(sumarLabelHideTimerRef.current);
      sumarLabelHideTimerRef.current = null;
    }

    if (sumarLabelClearTimerRef.current) {
      clearTimeout(sumarLabelClearTimerRef.current);
      sumarLabelClearTimerRef.current = null;
    }
  }

  function resetSumarLabel() {
    clearSumarLabelTimers();
    setSumarLabelVisible(false);
    setSumarLabelExiting(false);
  }

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
    if (!longPressEnabled || modoSeleccion) {
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;

    if (!start || !longPressTimerRef.current) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (
      Math.abs(dx) >= LONG_PRESS_MOVE_CANCEL_PX ||
      Math.abs(dy) >= LONG_PRESS_MOVE_CANCEL_PX
    ) {
      pointerStartRef.current = null;
      clearLongPressTimer();
    }
  }

  function handlePointerEnd() {
    pointerStartRef.current = null;
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
    if (!longPressEnabled || modoSeleccion) {
      return;
    }

    event.preventDefault();
    openActions();
  }

  function runAction(action: () => void) {
    onCloseActions();
    action();
  }

  const actionButtons = [
    mostrarSumarMisCanciones && onSumarAMisCanciones
      ? {
          key: "sumar",
          label: `Sumar ${cancion.nombre} a Mis canciones`,
          className: "",
          icon: Bookmark,
          action: () => onSumarAMisCanciones(cancion),
        }
      : null,
    mutationsEnabled
      ? {
          key: "editar",
          label: `Editar ${cancion.nombre}`,
          className:
            "flex size-12 items-center justify-center rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
          icon: Pencil,
          action: () => onEditar(cancion),
        }
      : null,
    mutationsEnabled
      ? {
          key: "eliminar",
          label: `Eliminar ${cancion.nombre}`,
          className:
            "flex size-12 items-center justify-center rounded-full bg-[#d94a3d] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
          icon: Trash2,
          action: () => onEliminar(cancion),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    className: string;
    icon: typeof Bookmark;
    action: () => void;
  }>;

  const hasSumarAction = actionButtons.some((button) => button.key === "sumar");

  useEffect(() => {
    if (!actionsOpen) {
      resetSumarLabel();
      return;
    }

    if (!hasSumarAction) {
      return;
    }

    const cascadeCompleteMs =
      (actionButtons.length - 1) * ACTION_FAB_CASCADE_STEP_MS +
      ACTION_FAB_ANIM_MS;

    sumarLabelShowTimerRef.current = setTimeout(() => {
      sumarLabelShowTimerRef.current = null;
      setSumarLabelExiting(false);
      setSumarLabelVisible(true);

      sumarLabelHideTimerRef.current = setTimeout(() => {
        sumarLabelHideTimerRef.current = null;
        setSumarLabelExiting(true);

        sumarLabelClearTimerRef.current = setTimeout(() => {
          sumarLabelClearTimerRef.current = null;
          setSumarLabelVisible(false);
          setSumarLabelExiting(false);
        }, COLA_AVISO_EXIT_MS);
      }, SUMAR_FAB_LABEL_VISIBLE_MS);
    }, cascadeCompleteMs);

    return () => {
      resetSumarLabel();
    };
  }, [actionButtons.length, actionsOpen, hasSumarAction]);

  return (
    <article
      className={`relative cursor-pointer touch-pan-y rounded-[12px] border bg-bg-card px-3 py-3 select-none ${
        actionsOpen || modoSeleccion
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border-card"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <LetraFuenteIcon tipo="cancionero" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-text-primary">
            {cancion.nombre}
          </p>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-[14px] text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
        <Bookmark
          className="size-3.5 shrink-0"
          style={{ color: "var(--tuner-in-tune)" }}
          aria-hidden="true"
        />
      </div>

      {actionsOpen && actionButtons.length > 0 && (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
            onClick={onCloseActions}
          />
          <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
            {actionButtons.map(
              ({ key, label, className, icon: Icon, action }, index) => {
                const cascadeIndex = actionButtons.length - 1 - index;
                const isSumar = key === "sumar";
                const showSumarLabel = isSumar && sumarLabelVisible;

                return (
                  <TapButton
                    key={key}
                    aria-label={label}
                    onClick={(event) => {
                      event.stopPropagation();
                      runAction(action);
                    }}
                    className={`cancionero-action-fab-item ${
                      isSumar
                        ? `flex max-w-[min(72vw,16rem)] items-center overflow-hidden rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] ${
                            showSumarLabel
                              ? "min-h-12 gap-0 py-2 pl-3 pr-3"
                              : "size-12 justify-center"
                          }`
                        : className
                    }`}
                    style={{
                      animationDelay: `${cascadeIndex * ACTION_FAB_CASCADE_STEP_MS}ms`,
                    }}
                  >
                    {isSumar ? (
                      <>
                        <span
                          role={showSumarLabel ? "status" : undefined}
                          aria-live={showSumarLabel ? "polite" : undefined}
                          className={`sala-fila-aviso-slot ${
                            !showSumarLabel
                              ? "sala-fila-aviso-slot--idle"
                              : sumarLabelExiting
                                ? "sala-fila-aviso-slot--out"
                                : "sala-fila-aviso-slot--in"
                          }`}
                        >
                          <span
                            className={`sala-fila-aviso-text block min-w-0 overflow-hidden whitespace-nowrap text-[12px] font-semibold text-accent ${
                              showSumarLabel
                                ? sumarLabelExiting
                                  ? "sala-fila-aviso-text-out"
                                  : "sala-fila-aviso-text-in"
                                : ""
                            }`}
                          >
                            {SUMAR_FAB_LABEL}
                          </span>
                        </span>
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                      </>
                    ) : (
                      <Icon className="size-5" aria-hidden="true" />
                    )}
                  </TapButton>
                );
              },
            )}
          </div>
        </>
      )}
    </article>
  );
}
