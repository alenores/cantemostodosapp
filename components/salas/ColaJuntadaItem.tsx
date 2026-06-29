"use client";

import type { ColaItem } from "@/types";
import { Check, GripVertical, Play } from "lucide-react";
import type { HTMLAttributes } from "react";

export type ColaJuntadaItemVariant = "tocada" | "activa" | "proxima" | "pendiente";

type ColaDisplayItem = Pick<ColaItem, "id" | "nombre" | "artista">;

type ColaJuntadaItemProps = {
  item: ColaDisplayItem;
  variant: ColaJuntadaItemVariant;
  isDragging?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  onVolverAPendiente?: (id: number) => void;
};

export default function ColaJuntadaItem({
  item,
  variant,
  isDragging = false,
  dragHandleProps,
  onVolverAPendiente,
}: ColaJuntadaItemProps) {
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
          <p className="pointer-events-none truncate text-sm font-semibold text-gray-900">
            {item.nombre}
          </p>
          {item.artista ? (
            <p className="pointer-events-none truncate text-xs text-gray-500">
              {item.artista}
            </p>
          ) : null}
        </div>
        <span className="pointer-events-none shrink-0 rounded bg-[#F4845F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F4845F]">
          Tocando
        </span>
      </div>
    );
  }

  const isProxima = variant === "proxima";
  const cardClass = isProxima
    ? isDragging
      ? "border border-accent bg-bg-card opacity-50"
      : "border border-accent/30 bg-bg-card"
    : isDragging
      ? "border border-border/30 bg-bg-card opacity-50"
      : "border border-border/30 bg-bg-card";

  return (
    <div
      {...dragHandleProps}
      className={`flex select-none cursor-grab items-center gap-2 rounded-xl px-3 py-2.5 active:cursor-grabbing ${cardClass}`}
    >
      <GripVertical
        className="pointer-events-none size-4 shrink-0 text-text-muted/40"
        aria-hidden="true"
      />
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="pointer-events-none truncate text-sm font-medium text-text-primary">
          {item.nombre}
        </p>
        {item.artista ? (
          <p className="pointer-events-none truncate text-xs text-text-muted">
            {item.artista}
          </p>
        ) : null}
      </div>
      {isProxima ? (
        <span className="pointer-events-none shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
          Próx
        </span>
      ) : null}
    </div>
  );
}
