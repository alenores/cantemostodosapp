"use client";

import UserAvatar from "@/components/perfil/UserAvatar";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import { getColaItemIconoTipo } from "@/lib/buscador";
import type { ColaItem } from "@/types";
import { Check, GripVertical, Play } from "lucide-react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

export type ColaJuntadaItemVariant = "tocada" | "activa" | "proxima" | "pendiente";

const COLA_ITEM_TITLE_CLASS =
  "truncate text-[15px] font-semibold leading-snug text-text-primary";
const COLA_ITEM_ARTIST_CLASS =
  "truncate text-[13px] leading-snug text-text-muted";

type ColaDisplayItem = Pick<
  ColaItem,
  | "id"
  | "nombre"
  | "artista"
  | "agregado_nombre"
  | "agregado_avatar_url"
  | "letra_texto"
> & {
  url_letra?: string | null;
};

type ColaJuntadaItemProps = {
  item: ColaDisplayItem;
  variant: ColaJuntadaItemVariant;
  premium?: boolean;
  showAgregadoAvatar?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  onVolverAPendiente?: (id: number) => void;
  nombreRevealGeneration?: number;
  nombreRevealIndex?: number;
};

const ColaJuntadaItem = forwardRef<HTMLDivElement, ColaJuntadaItemProps>(
  function ColaJuntadaItem(
    {
      item,
      variant,
      premium = false,
      dragHandleProps,
      onVolverAPendiente,
      nombreRevealGeneration,
      nombreRevealIndex,
      showAgregadoAvatar = true,
    },
    ref,
  ) {
    if (variant === "tocada") {
      return (
        <div className="pointer-events-none flex items-center gap-2 px-3 py-2 opacity-40">
          <Check className="pointer-events-none size-3 shrink-0 text-text-muted" />
          <p className="pointer-events-none min-w-0 flex-1 truncate text-xs text-text-muted line-through">
            {item.nombre}
          </p>
          {onVolverAPendiente ? (
            <button
              type="button"
              onClick={() => onVolverAPendiente(item.id)}
              className="pointer-events-auto shrink-0 rounded border border-border/50 px-2 py-0.5 text-[10px] text-text-muted"
            >
              + lista
            </button>
          ) : null}
        </div>
      );
    }

    if (variant === "activa") {
      return (
        <div className="pointer-events-none flex items-center gap-3 rounded-xl bg-white px-3 py-3">
          <Play
            className="pointer-events-none size-4 shrink-0 text-[#F4845F]"
            fill="#F4845F"
            aria-hidden="true"
          />
          <div className="pointer-events-none min-w-0 flex-1">
            <p className="pointer-events-none truncate text-[15px] font-semibold leading-snug text-gray-900">
              {item.nombre}
            </p>
            {item.artista ? (
              <p className="pointer-events-none truncate text-[13px] leading-snug text-gray-500">
                {item.artista}
              </p>
            ) : null}
          </div>
          <div
            className="pointer-events-none cola-activa-eq shrink-0 rounded bg-[#F4845F]/15 px-2.5 py-1.5"
            role="status"
            aria-label="Tocando"
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="cola-activa-eq-bar"
                style={{ animationDelay: `${index * 0.12}s` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      );
    }

    const isProxima = variant === "proxima";
    const cardClass = "border border-border/30 bg-bg-card";
    const { style: dragStyle, ...restDragHandleProps } = dragHandleProps ?? {};
    const cascadeNombre =
      nombreRevealGeneration !== undefined &&
      nombreRevealGeneration > 0 &&
      nombreRevealIndex !== undefined;
    const iconoTipo = getColaItemIconoTipo({
      url_letra: item.url_letra ?? "",
      letra_texto: item.letra_texto,
    });
    const showAvatar =
      showAgregadoAvatar &&
      (Boolean(item.agregado_avatar_url) || Boolean(item.agregado_nombre));

    return (
      <div
        ref={ref}
        {...restDragHandleProps}
        style={{
          WebkitTapHighlightColor: "transparent",
          outline: "none",
          ...dragStyle,
        }}
        className={`relative flex select-none cursor-grab items-center gap-2 rounded-xl px-3 py-2.5 outline-none focus:outline-none focus-visible:outline-none ${cardClass} ${showAvatar ? "pr-10" : ""} ${isProxima ? "pb-5" : ""}`}
      >
        {showAvatar ? (
          <div
            className="pointer-events-none absolute right-2.5 top-2.5 z-10"
            aria-label={
              item.agregado_nombre
                ? `Agregada por ${item.agregado_nombre}`
                : "Agregada por usuario desconocido"
            }
            title={item.agregado_nombre ?? undefined}
          >
            <UserAvatar
              nombre={item.agregado_nombre ?? ""}
              email=""
              avatarUrl={item.agregado_avatar_url ?? null}
              size={22}
            />
          </div>
        ) : null}

        <GripVertical
          className="pointer-events-none size-4 shrink-0 self-center text-text-muted/40"
          aria-hidden="true"
        />

        <div className="pointer-events-none flex min-w-0 flex-1 items-start gap-2">
          <div
            className="flex size-5 shrink-0 items-center justify-center self-center"
            aria-hidden="true"
          >
            <LetraFuenteIcon tipo={iconoTipo} uniform premium={premium} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`min-w-0 overflow-hidden ${COLA_ITEM_TITLE_CLASS}`}>
              <span
                key={
                  cascadeNombre
                    ? `${nombreRevealGeneration}-${item.id}`
                    : String(item.id)
                }
                className={
                  cascadeNombre
                    ? "cola-nombre-reveal block truncate"
                    : "block truncate"
                }
                style={
                  cascadeNombre
                    ? { animationDelay: `${nombreRevealIndex * 65}ms` }
                    : undefined
                }
              >
                {item.nombre}
              </span>
            </p>
            {item.artista ? (
              <p className={COLA_ITEM_ARTIST_CLASS}>{item.artista}</p>
            ) : null}
          </div>
        </div>

        {isProxima ? (
          <span className="pointer-events-none absolute right-3 bottom-1.5 text-[9px] font-medium text-accent/75">
            Próx
          </span>
        ) : null}
      </div>
    );
  },
);

export default ColaJuntadaItem;
