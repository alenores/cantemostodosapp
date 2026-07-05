"use client";

import {
  CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS,
  CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS,
  cifradoEditorToolbarSegmentedButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import CifradoIntensidadPatternRow from "@/components/cifrado/CifradoIntensidadPatternRow";
import { TapButton } from "@/components/ui/TapFeedback";
import { COMPAS_LABELS, type TipoCompas } from "@/lib/cifrado";
import { formatCompositorCycleSummary } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import {
  CIFRADO_LABEL_CICLO_GUARDADO,
  CIFRADO_LABEL_CICLOS_GUARDADOS,
  CIFRADO_LABEL_COMPONER_CICLO,
  CIFRADO_LABEL_SIN_CICLO,
  RITMO_LABEL_INTENSIDAD,
} from "@/lib/ritmo-terminologia";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { RefreshCw } from "lucide-react";

export type CifradoCompasToolTab = "componer" | "guardado";

type CifradoCompasToolPanelProps = {
  tab: CifradoCompasToolTab;
  onTabChange: (tab: CifradoCompasToolTab) => void;
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
};

export function CifradoCompasToolPanel({
  tab,
  onTabChange,
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
}: CifradoCompasToolPanelProps) {
  return (
    <div className="space-y-2">
      <div
        className="flex gap-1 rounded-full border border-border bg-bg-darker p-0.5"
        role="tablist"
        aria-label="Herramienta de compás"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "componer"}
          onClick={() => onTabChange("componer")}
          className={cifradoEditorToolbarSegmentedButtonClass(tab === "componer")}
        >
          {CIFRADO_LABEL_COMPONER_CICLO}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "guardado"}
          onClick={() => onTabChange("guardado")}
          className={cifradoEditorToolbarSegmentedButtonClass(tab === "guardado")}
        >
          {CIFRADO_LABEL_CICLO_GUARDADO}
        </button>
      </div>

      {tab === "guardado" ? (
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}>
              {CIFRADO_LABEL_CICLOS_GUARDADOS}
            </span>
            <select
              value={activeCycleId ?? ""}
              disabled={cyclesLoading}
              onChange={(event) => {
                const next = event.target.value;
                onSelectSavedCycle(next ? next : null);
              }}
              className={`mt-1 w-full rounded-[10px] border bg-bg-darker px-2.5 py-2 text-xs font-semibold text-text-primary outline-none focus:border-compositor-config disabled:opacity-50 ${
                activeCycleId
                  ? "border-compositor-config/45 ring-1 ring-compositor-config/25"
                  : "border-border"
              }`}
            >
              <option value="">{CIFRADO_LABEL_SIN_CICLO}</option>
              {savedCycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.nombre} · {formatCompositorCycleSummary(cycle.piece)}
                </option>
              ))}
            </select>
          </label>

          <TapButton
            type="button"
            aria-label="Actualizar ciclos"
            disabled={cyclesLoading}
            onClick={() => void onRefreshCycles()}
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-darker disabled:opacity-40"
          >
            <RefreshCw
              className={`size-3.5 text-text-muted ${cyclesLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </TapButton>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="shrink-0">
            <p className={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}>Compás</p>
            <div
              className={CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS}
              role="group"
              aria-label="Compás"
            >
              {(Object.keys(COMPAS_LABELS) as TipoCompas[]).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={tipoCompas === tipo}
                  onClick={() => onTipoCompasChange(tipo)}
                  className={cifradoEditorToolbarSegmentedButtonClass(tipoCompas === tipo)}
                >
                  {COMPAS_LABELS[tipo]}
                </button>
              ))}
            </div>
          </div>

          <div className="shrink-0">
            <p className={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}>{RITMO_LABEL_INTENSIDAD}</p>
            <CifradoIntensidadPatternRow
              pattern={intensidadPattern}
              onCycleSlot={onCycleIntensidadSlot}
              showClearSelection={showClearIntensidadSelection}
              onClearSelection={onClearIntensidadSelection}
            />
          </div>
        </div>
      )}

      {cyclesError ? (
        <p className="text-[11px] text-[var(--tuner-lejos)]">{cyclesError}</p>
      ) : null}

      {!cyclesLoading && tab === "guardado" && savedCycles.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          No hay ciclos guardados. Creá uno en el Compositor.
        </p>
      ) : null}
    </div>
  );
}