"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  ANOTACION_TIPO_LABEL,
  ANOTACION_TIPOS,
  type AnotacionTipo,
  type AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import {
  Eye,
  EyeOff,
  NotebookPen,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";

type ToggleItem = {
  key: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
};

type LecturaTogglesFabProps = {
  compasesDisponibles: boolean;
  compasesOcultos: boolean;
  onToggleCompases: () => void;
  acordesOcultos: boolean;
  onToggleAcordes: () => void;
  anotacionesVisibility?: AnotacionVisibility;
  anotacionTiposPresentes?: AnotacionTipo[];
  onToggleAnotacionTipo?: (tipo: AnotacionTipo) => void;
  onOpenNotaGeneral?: () => void;
  tieneNotaGeneral?: boolean;
  onEdit?: () => void;
};

/** Celular: botón arriba a la derecha que despliega FABs de mostrar/ocultar cada capa. */
export default function LecturaTogglesFab({
  compasesDisponibles,
  compasesOcultos,
  onToggleCompases,
  acordesOcultos,
  onToggleAcordes,
  anotacionesVisibility,
  anotacionTiposPresentes = [],
  onToggleAnotacionTipo,
  onOpenNotaGeneral,
  tieneNotaGeneral = false,
  onEdit,
}: LecturaTogglesFabProps) {
  const [open, setOpen] = useState(false);

  useHardwareBack(open, () => setOpen(false));

  const items: ToggleItem[] = [];

  if (compasesDisponibles) {
    items.push({
      key: "compases",
      label: "compases",
      visible: !compasesOcultos,
      onToggle: onToggleCompases,
    });
  }

  items.push({
    key: "acordes",
    label: "acordes",
    visible: !acordesOcultos,
    onToggle: onToggleAcordes,
  });

  if (anotacionesVisibility && onToggleAnotacionTipo) {
    for (const tipo of ANOTACION_TIPOS) {
      if (!anotacionTiposPresentes.includes(tipo)) {
        continue;
      }

      items.push({
        key: tipo,
        label: ANOTACION_TIPO_LABEL[tipo].toLowerCase(),
        visible: anotacionesVisibility[tipo],
        onToggle: () => onToggleAnotacionTipo(tipo),
      });
    }
  }

  const hasActions = Boolean(onOpenNotaGeneral || onEdit);

  return (
    <div className="absolute right-3 top-16 z-40 lg:hidden">
      {open ? (
        <button
          type="button"
          aria-label="Cerrar controles"
          className="fixed inset-0 -z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex flex-col items-end gap-2">
        <TapButton
          type="button"
          aria-label={open ? "Cerrar controles de vista" : "Controles de vista"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-bg-card shadow-md"
        >
          {open ? (
            <X className="size-5 text-text-primary" aria-hidden="true" />
          ) : (
            <SlidersHorizontal
              className="size-5 text-text-primary"
              aria-hidden="true"
            />
          )}
        </TapButton>

        {open ? (
          <>
            {items.map((item) => (
              <TapButton
                key={item.key}
                type="button"
                onClick={item.onToggle}
                className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2 text-xs font-semibold text-text-primary shadow-md"
              >
                {item.visible ? (
                  <Eye className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-4 shrink-0" aria-hidden="true" />
                )}
                {item.visible ? "Ocultar" : "Mostrar"} {item.label}
              </TapButton>
            ))}

            {hasActions && items.length > 0 ? (
              <div
                className="my-0.5 h-px w-10 bg-border"
                aria-hidden="true"
              />
            ) : null}

            {onOpenNotaGeneral ? (
              <TapButton
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenNotaGeneral();
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2 text-xs font-semibold text-text-primary shadow-md"
              >
                <NotebookPen
                  className="size-4 shrink-0 text-[var(--accent-entrenador-canciones)]"
                  aria-hidden="true"
                />
                Nota
                {tieneNotaGeneral ? (
                  <span
                    className="size-1.5 rounded-full bg-[var(--accent-entrenador-canciones)]"
                    aria-hidden="true"
                  />
                ) : null}
              </TapButton>
            ) : null}

            {onEdit ? (
              <TapButton
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex items-center gap-1.5 rounded-full border border-[var(--accent-entrenador-canciones)] bg-[var(--accent-entrenador-canciones)] px-3 py-2 text-xs font-semibold text-[var(--text-on-light)] shadow-md"
              >
                <Pencil className="size-4 shrink-0" aria-hidden="true" />
                Editar
              </TapButton>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
