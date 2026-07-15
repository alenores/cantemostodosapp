"use client";

import {
  CifradoCompasToolPanel,
  type CifradoCompasToolTab,
} from "@/components/cifrado/CifradoCompasToolPanel";
import { CifradoEditorHelpButton } from "@/components/cifrado/CifradoEditorHelpModal";
import {
  CIFRADO_EDITOR_PC_COMPAS_STRIP_CLASS,
  CIFRADO_EDITOR_PC_TOOLBAR_SHELL_CLASS,
  cifradoEditorPcTabClass,
} from "@/components/cifrado/cifrado-controls-ui";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

type ModoInsercion = "acordes" | "compas" | "letra" | "canto";

type CifradoEditorPcToolbarProps = {
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
};

export function CifradoEditorPcToolbar({
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
}: CifradoEditorPcToolbarProps) {
  return (
    <div className={CIFRADO_EDITOR_PC_TOOLBAR_SHELL_CLASS}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="inline-flex shrink-0 gap-1 rounded-full border border-border/80 bg-bg-dark p-0.5"
          role="tablist"
          aria-label="Modo edición"
        >
          <button
            type="button"
            role="tab"
            aria-selected={modoInsercion === "acordes"}
            onClick={() => onSetModoInsercion("acordes")}
            className={cifradoEditorPcTabClass(modoInsercion === "acordes")}
          >
            Acordes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modoInsercion === "compas"}
            onClick={() => onSetModoInsercion("compas")}
            className={cifradoEditorPcTabClass(modoInsercion === "compas")}
          >
            Compás
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modoInsercion === "letra"}
            onClick={() => onSetModoInsercion("letra")}
            className={cifradoEditorPcTabClass(modoInsercion === "letra")}
          >
            Letra
          </button>
          {anotacionesEnabled ? (
            <button
              type="button"
              role="tab"
              aria-selected={modoInsercion === "canto"}
              onClick={() => onSetModoInsercion("canto")}
              className={cifradoEditorPcTabClass(modoInsercion === "canto")}
            >
              Canto
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CifradoEditorHelpButton onClick={onOpenHelp} />
        </div>
      </div>

      {modoInsercion === "compas" ? (
        <div className={CIFRADO_EDITOR_PC_COMPAS_STRIP_CLASS}>
          <CifradoCompasToolPanel
            variant="desktop"
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
        </div>
      ) : null}

      {modoInsercion === "canto" ? (
        <p className="px-4 pb-2.5 text-xs text-text-muted">
          Tocá la letra donde quieras una marca y elegí el tipo. Para editar,
          tocá una marca existente.
        </p>
      ) : null}
    </div>
  );
}
