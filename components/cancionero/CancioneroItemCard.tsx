"use client";

import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { Bookmark, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";

const LONG_PRESS_MS = 500;

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
  const suppressClickRef = useRef(false);

  const longPressEnabled =
    mutationsEnabled && (mostrarSumarMisCanciones || mutationsEnabled);

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
    if (!longPressEnabled || modoSeleccion) {
      return;
    }

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
          className:
            "flex size-12 items-center justify-center rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
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

  return (
    <article
      className={`relative cursor-pointer rounded-[12px] border bg-bg-card px-3 py-3 select-none ${
        actionsOpen || modoSeleccion
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border-card"
      }`}
      onPointerDown={handlePointerDown}
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
            className="fixed inset-0 z-40"
            onClick={onCloseActions}
          />
          <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
            {actionButtons.map(({ key, label, className, icon: Icon, action }) => (
              <TapButton
                key={key}
                aria-label={label}
                onClick={(event) => {
                  event.stopPropagation();
                  runAction(action);
                }}
                className={className}
              >
                <Icon className="size-5" aria-hidden="true" />
              </TapButton>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
