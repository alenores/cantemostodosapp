"use client";

import type { ColaItem } from "@/types";
import { GripVertical } from "lucide-react";

export type ColaJuntadaItemVariant = "tocada" | "activa" | "proxima" | "pendiente";

type ColaJuntadaItemProps = {
  item: ColaItem;
  variant: ColaJuntadaItemVariant;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onActivar?: (id: number) => void;
};

export default function ColaJuntadaItem({
  item,
  variant,
  isDragging = false,
  dragHandleProps,
  onActivar,
}: ColaJuntadaItemProps) {
  const showDragHandle = variant === "proxima" || variant === "pendiente";
  const isInteractive = showDragHandle && onActivar !== undefined;

  const containerClass =
    variant === "activa"
      ? "border-border bg-white"
      : isDragging
        ? "border-accent bg-bg-card opacity-50"
        : variant === "tocada"
          ? "border-border-card bg-bg-card opacity-40"
          : "border-border-card bg-bg-card";

  const titleClass =
    variant === "activa"
      ? "truncate text-sm font-semibold text-gray-900"
      : variant === "tocada"
        ? "truncate text-sm font-semibold text-text-primary line-through"
        : "truncate text-sm font-semibold text-text-primary";

  const subtitleClass =
    variant === "activa"
      ? "truncate text-xs text-gray-600"
      : "truncate text-xs text-text-muted";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 ${containerClass}`}
    >
      {showDragHandle ? (
        <div
          {...dragHandleProps}
          className="shrink-0 cursor-grab touch-none p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4 text-text-muted/50" aria-hidden="true" />
        </div>
      ) : (
        <div className="w-6 shrink-0" aria-hidden="true" />
      )}

      <button
        type="button"
        disabled={!isInteractive}
        onClick={() => {
          if (isInteractive) {
            onActivar(item.id);
          }
        }}
        className={`min-w-0 flex-1 text-left ${
          isInteractive ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <p className={titleClass}>{item.nombre}</p>
        {item.artista ? <p className={subtitleClass}>{item.artista}</p> : null}
      </button>

      {variant === "activa" ? (
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
          Tocando
        </span>
      ) : null}

      {variant === "proxima" ? (
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent/80">
          Próx
        </span>
      ) : null}
    </div>
  );
}
