"use client";

import AgregadoFichaDialog from "@/components/cancionero/AgregadoFichaDialog";
import CompasMarcaIcon from "@/components/cancionero/CompasMarcaIcon";
import ValidacionMarcaIcon from "@/components/cancionero/ValidacionMarcaIcon";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import CancioneroCardVisual from "@/components/cancionero/CancioneroCardVisual";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import { COLA_AVISO_EXIT_MS } from "@/lib/sala-layout";
import type { CancionCancionero } from "@/types";
import { Bookmark, Check, Pencil, Trash2 } from "lucide-react";
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
const SUMAR_FAB_LABEL = "Guardar en Favoritas";
const QUITAR_FAB_LABEL = "Quitar de Favoritas";
const SUMAR_FAB_LABEL_VISIBLE_MS = 2000;

type ActionButton = {
  key: string;
  label: string;
  className: string;
  icon: typeof Bookmark;
  iconClassName?: string;
  action: () => void;
};

type CancioneroItemCardProps = {
  cancion: CancionCancionero;
  isDesktop?: boolean;
  mutationsEnabled?: boolean;
  puedeEditarEliminar?: boolean;
  isFavorita?: boolean;
  mostrarSumarMisCanciones?: boolean;
  modoSeleccion?: boolean;
  actionsOpen: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onVer: (cancion: CancionCancionero) => void;
  /** Suma a Favoritas o la quita si ya está. */
  onAlternarFavorita?: (cancion: CancionCancionero) => void;
  onEditar: (cancion: CancionCancionero) => void;
  onEliminar: (cancion: CancionCancionero) => void;
  /** Dueño o amigo, con la canción todavía sin validar. */
  puedePonerValidacion?: boolean;
  onValidar?: (cancion: CancionCancionero) => void;
  onVerValidacion?: (cancion: CancionCancionero) => void;
  artistaAvatarUrl?: string | null;
};

export default function CancioneroItemCard({
  artistaAvatarUrl,
  cancion,
  isDesktop = false,
  mutationsEnabled = true,
  puedeEditarEliminar = false,
  isFavorita = false,
  mostrarSumarMisCanciones = false,
  modoSeleccion = false,
  actionsOpen,
  onOpenActions,
  onCloseActions,
  onVer,
  onAlternarFavorita,
  onEditar,
  onEliminar,
  puedePonerValidacion = false,
  onValidar,
  onVerValidacion,
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
  const [isPressed, setIsPressed] = useState(false);
  const [agregadoAbierto, setAgregadoAbierto] = useState(false);

  const agregadoNombre = cancion.agregado_nombre?.trim() ?? "";
  const mostrarMarcaFavorita = isFavorita;
  const puedeTocarFavorita =
    mostrarMarcaFavorita &&
    isDesktop &&
    !modoSeleccion &&
    Boolean(onAlternarFavorita) &&
    mostrarSumarMisCanciones;

  const longPressEnabled =
    !isDesktop &&
    !modoSeleccion &&
    ((mostrarSumarMisCanciones && Boolean(onAlternarFavorita)) ||
      (mutationsEnabled && puedeEditarEliminar) ||
      puedePonerValidacion);

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
    if (event.button !== 0) return;

    setIsPressed(true);
    pointerStartRef.current = { x: event.clientX, y: event.clientY };

    if (!longPressEnabled) {
      return;
    }

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setIsPressed(false);
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;

    if (!start) {
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
      setIsPressed(false);
    }
  }

  function handlePointerEnd() {
    pointerStartRef.current = null;
    clearLongPressTimer();
    setIsPressed(false);
  }

  function handleClick() {
    if (agregadoAbierto) {
      setAgregadoAbierto(false);
      return;
    }

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
    if (!longPressEnabled) {
      return;
    }

    event.preventDefault();
    openActions();
  }

  function runAction(action: () => void) {
    onCloseActions();
    action();
  }

  function runDesktopAction(
    event: MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) {
    event.stopPropagation();
    action();
  }

  const actionButtons = [
    mostrarSumarMisCanciones && onAlternarFavorita
      ? {
          key: "sumar",
          label: isFavorita
            ? `Quitar ${cancion.nombre} de Favoritas`
            : `Guardar ${cancion.nombre} en Favoritas`,
          className: "",
          icon: Bookmark,
          iconClassName: isFavorita
            ? "fill-current text-[var(--tuner-in-tune)]"
            : undefined,
          action: () => onAlternarFavorita(cancion),
        }
      : null,
    puedePonerValidacion && onValidar
      ? {
          key: "validar",
          label: `Validar ${cancion.nombre}`,
          className:
            "flex size-12 items-center justify-center rounded-full bg-[#0095F6] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
          icon: Check,
          action: () => onValidar(cancion),
        }
      : null,
    mutationsEnabled && puedeEditarEliminar
      ? {
          key: "editar",
          label: `Editar ${cancion.nombre}`,
          className:
            "flex size-12 items-center justify-center rounded-full border border-border bg-bg-dark text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
          icon: Pencil,
          action: () => onEditar(cancion),
        }
      : null,
    mutationsEnabled && puedeEditarEliminar
      ? {
          key: "eliminar",
          label: `Eliminar ${cancion.nombre}`,
          className:
            "flex size-12 items-center justify-center rounded-full bg-[#d94a3d] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]",
          icon: Trash2,
          action: () => onEliminar(cancion),
        }
      : null,
  ].filter(Boolean) as ActionButton[];

  const hasSumarAction = actionButtons.some((button) => button.key === "sumar");

  useEffect(() => {
    if (!actionsOpen || isDesktop) {
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
  }, [actionButtons.length, actionsOpen, hasSumarAction, isDesktop]);

  return (
    <article
      style={isPressed ? { transform: "scale(0.97)" } : undefined}
      className={`relative w-full min-w-0 max-w-full cursor-pointer touch-pan-y rounded-estandar border bg-bg-card p-3 select-none transition-transform duration-100 ease-out hover:border-text-faint/50 ${
        (!isDesktop && actionsOpen) || modoSeleccion
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
      <CancioneroCardVisual
        nombre={cancion.nombre}
        artista={cancion.artista}
        artistaAvatarUrl={artistaAvatarUrl}
        iconos={
          <>
            {agregadoNombre ? (
              <button
                type="button"
                aria-label={`Ver quién agregó ${cancion.nombre}`}
                title={agregadoNombre}
                className="size-[22px] shrink-0 overflow-hidden rounded-full"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setAgregadoAbierto(true);
                }}
              >
                {cancion.agregado_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cancion.agregado_avatar_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-[#57515b] text-[10px] font-semibold text-text-primary">
                    {agregadoNombre.charAt(0).toLocaleUpperCase("es")}
                  </span>
                )}
              </button>
            ) : null}
            <LetraFuenteIcon
              tipo="cancionero"
              premium={cancion.tiene_cifrado_avanzado}
              compact
            />
            {cancion.tiene_compases ? <CompasMarcaIcon /> : null}
            {cancion.validada_por ? (
              modoSeleccion ? (
                <ValidacionMarcaIcon />
              ) : (
                <button
                  type="button"
                  aria-label={`Ver quién validó ${cancion.nombre}`}
                  className="rounded-full"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onVerValidacion?.(cancion);
                  }}
                >
                  <ValidacionMarcaIcon silenciosa />
                </button>
              )
            ) : null}
            {mostrarMarcaFavorita ? (
              puedeTocarFavorita ? (
                <TapButton
                  type="button"
                  aria-label={
                    isFavorita
                      ? `Quitar ${cancion.nombre} de Favoritas`
                      : `Guardar ${cancion.nombre} en Favoritas`
                  }
                  aria-pressed={isFavorita}
                  title={isFavorita ? QUITAR_FAB_LABEL : SUMAR_FAB_LABEL}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) =>
                    runDesktopAction(event, () => onAlternarFavorita?.(cancion))
                  }
                  className="flex size-6 items-center justify-center rounded-md text-text-secondary hover:text-[var(--tuner-in-tune)]/85"
                >
                  <Bookmark
                    className={`size-4 ${
                      isFavorita ? "fill-current text-[var(--tuner-in-tune)]" : ""
                    }`}
                    aria-hidden="true"
                  />
                </TapButton>
              ) : (
                <span
                  aria-label="En Favoritas"
                  className="flex size-6 items-center justify-center"
                >
                  <Bookmark
                    className="size-4 fill-current"
                    style={{ color: "var(--tuner-in-tune)" }}
                    aria-hidden="true"
                  />
                </span>
              )
            ) : null}
            {isDesktop && !modoSeleccion && puedePonerValidacion ? (
              <TapButton
                type="button"
                aria-label={`Validar ${cancion.nombre}`}
                title="Validar"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) =>
                  runDesktopAction(event, () => onValidar?.(cancion))
                }
                className="flex size-6 items-center justify-center rounded-md"
              >
                <ValidacionMarcaIcon className="size-[18px]" silenciosa />
              </TapButton>
            ) : null}
            {isDesktop && !modoSeleccion && puedeEditarEliminar ? (
              <>
                <TapButton
                  type="button"
                  aria-label={`Editar ${cancion.nombre}`}
                  title="Editar"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) =>
                    runDesktopAction(event, () => onEditar(cancion))
                  }
                  disabled={!mutationsEnabled}
                  className="flex size-6 items-center justify-center rounded-md text-text-secondary hover:text-text-primary disabled:opacity-40"
                >
                  <Pencil className="size-[18px]" aria-hidden="true" />
                </TapButton>
                <TapButton
                  type="button"
                  aria-label={`Eliminar ${cancion.nombre}`}
                  title="Eliminar"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) =>
                    runDesktopAction(event, () => onEliminar(cancion))
                  }
                  disabled={!mutationsEnabled}
                  className="flex size-6 items-center justify-center rounded-md text-text-secondary hover:text-[#d94a3d] disabled:opacity-40"
                >
                  <Trash2 className="size-[18px]" aria-hidden="true" />
                </TapButton>
              </>
            ) : null}
          </>
        }
      />
      <AgregadoFichaDialog
        open={agregadoAbierto && Boolean(agregadoNombre)}
        nombre={agregadoNombre}
        avatarUrl={cancion.agregado_avatar_url ?? null}
        fecha={cancion.created_at ?? null}
        onCerrar={() => setAgregadoAbierto(false)}
      />

      {actionsOpen && actionButtons.length > 0 && !isDesktop && (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
            onClick={onCloseActions}
          />
          <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-end gap-2">
            {actionButtons.map(
              (
                { key, label, className, icon: Icon, iconClassName, action },
                index,
              ) => {
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
                            {isFavorita ? QUITAR_FAB_LABEL : SUMAR_FAB_LABEL}
                          </span>
                        </span>
                        <Icon
                          className={`size-5 shrink-0 ${iconClassName ?? ""}`}
                          aria-hidden="true"
                        />
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
