"use client";

import ColaItemCard from "@/components/salas/ColaItem";
import {
  buildReorderUpdates,
  deleteColaCompleta,
  deleteColaItem,
  persistColaOrden,
} from "@/lib/cola-logic";
import { buildGuardadaKey } from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Plus } from "lucide-react";

type ColaJuntadaSectionProps = {
  open: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  items: ColaItem[];
  guardadasKeys: Set<string>;
  salaId: number;
  onColaChange: () => Promise<void>;
};

export default function ColaJuntadaSection({
  open,
  expanded,
  onToggleExpand,
  items,
  guardadasKeys,
  salaId,
  onColaChange,
}: ColaJuntadaSectionProps) {
  async function handleDragEnd(result: DropResult) {
    const updates = buildReorderUpdates(items, result);

    if (!updates) {
      return;
    }

    const supabase = createClient();
    await persistColaOrden(supabase, updates);
    await onColaChange();
  }

  async function handleDeleteItem(itemId: number) {
    const confirmed = window.confirm(
      "¿Eliminar esta canción de la cola?",
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();
    await deleteColaItem(supabase, itemId);
    await onColaChange();
  }

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      "¿Borrar toda la cola de la juntada?",
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();
    await deleteColaCompleta(supabase, salaId);
    await onColaChange();
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-[52px] z-20 flex flex-col rounded-t-2xl bg-bg-dark transition-[max-height,transform] duration-350 ${
        open ? "translate-y-0" : "translate-y-full"
      } ${expanded ? "max-h-[calc(100dvh-108px)]" : "max-h-[45dvh]"}`}
      style={{ transitionTimingFunction: "var(--transition-timing)" }}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={expanded ? "Contraer cola" : "Expandir cola"}
        className="flex justify-center py-3"
      >
        <div className="h-1 w-10 rounded-full bg-border" />
      </button>

      <div className="flex items-center justify-between border-b border-border px-4 pb-3">
        <h2 className="text-base font-bold text-text-primary">
          Cola de la juntada
        </h2>
        <button
          type="button"
          aria-label="Agregar canción"
          className="flex size-11 items-center justify-center rounded-full border border-border text-text-primary"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>

      <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
        <Droppable droppableId="cola-juntada">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
            >
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  La cola está vacía
                </p>
              ) : (
                items.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={String(item.id)}
                    index={index}
                    isDragDisabled={item.estado !== "pendiente"}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                      >
                        <ColaItemCard
                          item={item}
                          items={items}
                          dragHandleProps={
                            item.estado === "pendiente"
                              ? draggableProvided.dragHandleProps
                              : null
                          }
                          isDragging={snapshot.isDragging}
                          yaGuardada={guardadasKeys.has(
                            buildGuardadaKey(item.nombre, item.url_letra),
                          )}
                          onDelete={(itemId) => void handleDeleteItem(itemId)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={() => void handleDeleteAll()}
          className="min-h-11 w-full rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-primary"
        >
          Borrar todo
        </button>
      </div>
    </div>
  );
}
