"use client";

import {
  CifradoCompasToolPanel,
  type CifradoCompasToolTab,
} from "@/components/cifrado/CifradoCompasToolPanel";
import { CifradoEditorHelpButton } from "@/components/cifrado/CifradoEditorHelpModal";
import {
  CIFRADO_EDITOR_PC_COMPAS_STRIP_CLASS,
  CIFRADO_EDITOR_PC_TOOLBAR_SHELL_CLASS,
  CIFRADO_EDITOR_PLAY_BUTTON_CLASS,
  cifradoEditorPcTabClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import type { TipoCompas } from "@/lib/cifrado";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { Pause, Play } from "lucide-react";

type ModoInsercion = "acordes" | "compas" | "letra";

type CifradoEditorPcToolbarProps = {
  modoInsercion: ModoInsercion;
  onSetModoInsercion: (modo: ModoInsercion) => void;
  hasCompas: boolean;
  playing: boolean;
  onTogglePlayback: () => void;
  compasToolTab: CifradoCompasToolTab;
  onCompasToolTabChange: (tab: CifradoCompasToolTab) => void;
  tipoCompas: TipoCompas;
  onTipoCompasChange: (tipo: TipoCompas) => void;
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
  hasCompas,
  playing,
  onTogglePlayback,
  compasToolTab,
  onCompasToolTabChange,
  tipoCompas,
  onTipoCompasChange,
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
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CifradoEditorHelpButton onClick={onOpenHelp} />

          {hasCompas ? (
            <TapButton
              type="button"
              onClick={onTogglePlayback}
              className={CIFRADO_EDITOR_PLAY_BUTTON_CLASS}
              aria-label={playing ? "Pausar compás" : "Reproducir compás"}
            >
              {playing ? (
                <Pause className="size-5" aria-hidden="true" />
              ) : (
                <Play className="size-5" aria-hidden="true" />
              )}
            </TapButton>
          ) : null}
        </div>
      </div>

      {modoInsercion === "compas" ? (
        <div className={CIFRADO_EDITOR_PC_COMPAS_STRIP_CLASS}>
          <CifradoCompasToolPanel
            variant="desktop"
            tab={compasToolTab}
            onTabChange={onCompasToolTabChange}
            tipoCompas={tipoCompas}
            onTipoCompasChange={onTipoCompasChange}
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
    </div>
  );
}
