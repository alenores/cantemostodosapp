import { getColaVariant, type ColaVariant } from "@/lib/cola-logic";
import type { ColaItem } from "@/types";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Bookmark, Trash2 } from "lucide-react";

type ColaItemProps = {
  item: ColaItem;
  items: ColaItem[];
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isDragging?: boolean;
  yaGuardada: boolean;
  onDelete: (id: number) => void;
};

function DragHandle({
  dragHandleProps,
}: {
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}) {
  return (
    <div
      {...dragHandleProps}
      className="grid shrink-0 grid-cols-2 gap-[3px] px-1 py-2"
      aria-label="Arrastrar para reordenar"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className="size-[3px] rounded-full bg-text-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function variantClasses(variant: ColaVariant): string {
  switch (variant) {
    case "tocada":
      return "border-border-subtle bg-bg-card opacity-[var(--cola-tocada-opacity)]";
    case "activa":
      return "border-accent bg-bg-card";
    case "proxima":
      return "border-cola-proxima-border bg-cola-proxima-bg";
    case "pendiente":
      return "border-border-card bg-bg-card";
  }
}

function orderClasses(variant: ColaVariant): string {
  switch (variant) {
    case "proxima":
      return "text-accent";
    case "pendiente":
      return "text-text-faint";
    default:
      return "text-text-muted";
  }
}

export default function ColaItemCard({
  item,
  items,
  dragHandleProps,
  isDragging = false,
  yaGuardada,
  onDelete,
}: ColaItemProps) {
  const variant = getColaVariant(item, items);
  const isInteractive = variant === "proxima" || variant === "pendiente";
  const showActions = isInteractive;

  return (
    <div
      className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 ${
        variantClasses(variant)
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {isInteractive ? (
        <DragHandle dragHandleProps={dragHandleProps} />
      ) : (
        <div className="w-6 shrink-0" aria-hidden="true" />
      )}

      <span
        className={`w-5 shrink-0 text-center text-xs font-bold ${orderClasses(variant)}`}
      >
        {item.orden}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {item.nombre}
        </p>
        {item.artista && (
          <p className="truncate text-xs text-text-muted">{item.artista}</p>
        )}
      </div>

      {variant === "tocada" && (
        <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
          Tocada
        </span>
      )}

      {variant === "activa" && (
        <span className="shrink-0 rounded-full border border-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
          Activa
        </span>
      )}

      {showActions && (
        <div className="flex shrink-0 items-center gap-1">
          {!yaGuardada && (
            <button
              type="button"
              aria-label="Guardar canción"
              className="flex size-11 items-center justify-center rounded-[10px] text-text-secondary"
            >
              <Bookmark className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label="Eliminar canción de la cola"
            onClick={() => onDelete(item.id)}
            className="flex size-11 items-center justify-center rounded-[10px] text-text-secondary"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
