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
  onSelect?: (id: number) => void;
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
      onClick={(event) => event.stopPropagation()}
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
  onSelect,
}: ColaItemProps) {
  const variant = getColaVariant(item, items);
  const isPendiente = item.estado === "pendiente";
  const showActions = isPendiente;

  return (
    <div
      className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 ${
        variantClasses(variant)
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {isPendiente ? (
        <DragHandle dragHandleProps={dragHandleProps} />
      ) : (
        <div className="w-6 shrink-0" aria-hidden="true" />
      )}

      <button
        type="button"
        disabled={!isPendiente}
        onClick={() => isPendiente && onSelect?.(item.id)}
        aria-label={isPendiente ? `Activar ${item.nombre}` : undefined}
        className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
          isPendiente ? "cursor-pointer" : "cursor-default"
        }`}
      >
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
      </button>

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
              onClick={(event) => event.stopPropagation()}
              className="flex size-11 items-center justify-center rounded-[10px] text-text-secondary"
            >
              <Bookmark className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label="Eliminar canción de la cola"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item.id);
            }}
            className="flex size-11 items-center justify-center rounded-[10px] text-text-secondary"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
