"use client";

import { AnotacionTipoChoices } from "@/components/cifrado/AnotacionPickers";
import {
  CifradoCompasToolPanel,
  type CifradoCompasToolTab,
} from "@/components/cifrado/CifradoCompasToolPanel";
import { CifradoEditorHelpButton } from "@/components/cifrado/CifradoEditorHelpModal";
import { APP_SIDEBAR_WIDTH_CSS } from "@/lib/app-layout";
import type { AnotacionTipo } from "@/lib/anotaciones-practica";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { NotebookPen } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModoInsercion = "acordes" | "compas" | "letra" | "canto";

type CifradoEditorPcRailProps = {
  modoInsercion: ModoInsercion;
  onSetModoInsercion: (modo: ModoInsercion) => void;
  anotacionesEnabled?: boolean;
  compasToolTab: CifradoCompasToolTab;
  onCompasToolTabChange: (tab: CifradoCompasToolTab) => void;
  cycleGolpes: number;
  onCycleGolpesChange: (golpes: number) => void;
  intensidadPattern: MetronomeBeatLevel[];
  onCycleIntensidadSlot: (slotIndex: number) => void;
  showClearIntensidadSelection: boolean;
  onClearIntensidadSelection: () => void;
  activeCycleId: string | null;
  savedCycles: CompositorCycle[];
  cyclesLoading: boolean;
  cyclesError: string | null;
  onRefreshCycles: () => Promise<void>;
  onSelectSavedCycle: (cycleId: string | null) => void;
  placementCycleCount: number;
  onPlacementCycleCountChange: (count: number) => void;
  onApplyCyclesToAllLines: () => void;
  onOpenHelp: () => void;
  cantoTipo: AnotacionTipo | null;
  onCantoTipoChange: (tipo: AnotacionTipo) => void;
  cantoEsperandoFin: boolean;
  cantoForm: ReactNode;
  onAbrirNota?: () => void;
  tieneNota?: boolean;
  /** En la página, se dibuja encima del menú. En el editor a pantalla completa, queda adentro. */
  portal?: boolean;
};

const MODOS: { id: ModoInsercion; label: string }[] = [
  { id: "acordes", label: "Acordes" },
  { id: "compas", label: "Compás" },
  { id: "letra", label: "Letra" },
  { id: "canto", label: "Canto" },
];

function modeButtonClass(active: boolean): string {
  return `flex h-9 items-center justify-center rounded-full px-2 text-xs font-bold transition-all ${
    active
      ? "bg-accent text-white shadow-sm"
      : "text-text-muted hover:bg-bg-card/70 hover:text-text-primary"
  }`;
}

function ayudaDeModo(
  modo: ModoInsercion,
  cantoTipo: AnotacionTipo | null,
  cantoEsperandoFin: boolean,
): string {
  if (modo === "acordes") {
    return "Tocá la letra donde quieras colocar un acorde.";
  }

  if (modo === "letra") {
    return "Tocá un renglón para escribir o corregir la letra.";
  }

  if (modo === "compas") {
    return "Armá el compás acá y después tocalo sobre la letra.";
  }

  if (cantoEsperandoFin) {
    return "Ahora tocá en la letra dónde termina el tramo.";
  }

  if (cantoTipo) {
    return "Tocá la letra en el lugar de la marca.";
  }

  return "Elegí una marca y después tocala sobre la letra.";
}

export function CifradoEditorPcRail({
  modoInsercion,
  onSetModoInsercion,
  anotacionesEnabled = false,
  compasToolTab,
  onCompasToolTabChange,
  cycleGolpes,
  onCycleGolpesChange,
  intensidadPattern,
  onCycleIntensidadSlot,
  showClearIntensidadSelection,
  onClearIntensidadSelection,
  activeCycleId,
  savedCycles,
  cyclesLoading,
  cyclesError,
  onRefreshCycles,
  onSelectSavedCycle,
  placementCycleCount,
  onPlacementCycleCountChange,
  onApplyCyclesToAllLines,
  onOpenHelp,
  cantoTipo,
  onCantoTipoChange,
  cantoEsperandoFin,
  cantoForm,
  onAbrirNota,
  tieneNota = false,
  portal = true,
}: CifradoEditorPcRailProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-editor-herramientas", "true");

    return () => {
      document.body.removeAttribute("data-editor-herramientas");
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const modos = MODOS.filter((modo) => modo.id !== "canto" || anotacionesEnabled);

  const rail = (
    <aside
      className="fixed inset-y-0 left-0 z-[35] flex flex-col border-r border-border bg-bg-darker"
      style={{ width: APP_SIDEBAR_WIDTH_CSS }}
      aria-label="Herramientas de edición"
    >
      <div className="flex shrink-0 justify-end px-3 pt-3">
        <CifradoEditorHelpButton onClick={onOpenHelp} />
      </div>

      <div className="shrink-0 px-3 pt-2">
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl border border-border/80 bg-bg-dark p-1"
          role="tablist"
          aria-label="Modo edición"
        >
          {modos.map((modo, index) => (
            <button
              key={modo.id}
              type="button"
              role="tab"
              aria-selected={modoInsercion === modo.id}
              onClick={() => onSetModoInsercion(modo.id)}
              className={`${modeButtonClass(modoInsercion === modo.id)}${
                modos.length % 2 === 1 && index === modos.length - 1
                  ? " col-span-2"
                  : ""
              }`}
            >
              {modo.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {modoInsercion === "canto" && cantoForm ? (
          cantoForm
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-text-muted">
              {ayudaDeModo(modoInsercion, cantoTipo, cantoEsperandoFin)}
            </p>

            {modoInsercion === "compas" ? (
              <CifradoCompasToolPanel
                variant="rail"
                tab={compasToolTab}
                onTabChange={onCompasToolTabChange}
                cycleGolpes={cycleGolpes}
                onCycleGolpesChange={onCycleGolpesChange}
                intensidadPattern={intensidadPattern}
                onCycleIntensidadSlot={onCycleIntensidadSlot}
                showClearIntensidadSelection={showClearIntensidadSelection}
                onClearIntensidadSelection={onClearIntensidadSelection}
                activeCycleId={activeCycleId}
                savedCycles={savedCycles}
                cyclesLoading={cyclesLoading}
                cyclesError={cyclesError}
                onRefreshCycles={onRefreshCycles}
                onSelectSavedCycle={onSelectSavedCycle}
                placementCycleCount={placementCycleCount}
                onPlacementCycleCountChange={onPlacementCycleCountChange}
                onApplyCyclesToAllLines={onApplyCyclesToAllLines}
              />
            ) : null}

            {modoInsercion === "canto" ? (
              <AnotacionTipoChoices
                selected={cantoTipo}
                onSelect={onCantoTipoChange}
              />
            ) : null}
          </div>
        )}
      </div>

      {onAbrirNota ? (
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={onAbrirNota}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-bg-card py-2.5 text-sm font-semibold text-text-primary"
          >
            <NotebookPen
              className="size-4 shrink-0 text-[var(--accent-entrenador-canciones)]"
              aria-hidden="true"
            />
            Nota
            {tieneNota ? (
              <span
                className="size-1.5 rounded-full bg-[var(--accent-entrenador-canciones)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        </div>
      ) : null}
    </aside>
  );

  if (!portal) {
    return rail;
  }

  return createPortal(rail, document.body);
}
