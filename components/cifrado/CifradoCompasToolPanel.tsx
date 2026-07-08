"use client";

import {
  CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS,
  CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS,
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_EDITOR_CYCLE_TOOL_BOX_CLASS,
  cifradoEditorPcTabClass,
  cifradoEditorToolbarSegmentedButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { CifradoCompasTypeStepper } from "@/components/cifrado/CifradoCompasTypeStepper";
import CifradoIntensidadPatternRow from "@/components/cifrado/CifradoIntensidadPatternRow";
import { TapButton } from "@/components/ui/TapFeedback";
import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import { MAX_COMPAS_PLACEMENT_CYCLE_COUNT } from "@/lib/cifrado";
import { formatCompositorCycleSummary } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { ritmoDesktopSectionTitleClass } from "@/lib/ritmo-compas-ui";
import {
  CIFRADO_LABEL_CICLO_GUARDADO,
  CIFRADO_LABEL_CICLOS_GUARDADOS,
  CIFRADO_LABEL_COMPONER_CICLO,
  CIFRADO_LABEL_SIN_CICLO,
  CIFRADO_LABEL_APLICAR_NUMERO_CICLOS,
  CIFRADO_HELP_APLICAR_NUMERO_CICLOS,
  CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES,
  RITMO_LABEL_INTENSIDAD,
} from "@/lib/ritmo-terminologia";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { RefreshCw } from "lucide-react";

export type CifradoCompasToolTab = "componer" | "guardado";

type CifradoCompasToolPanelProps = {
  tab: CifradoCompasToolTab;
  onTabChange: (tab: CifradoCompasToolTab) => void;
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
  variant?: "mobile" | "desktop";
};

function ComponerCycleControls({
  cycleGolpes,
  onCycleGolpesChange,
  intensidadPattern,
  onCycleIntensidadSlot,
  showClearIntensidadSelection,
  onClearIntensidadSelection,
  sectionLabelClass,
  fluidIntensidad = false,
  className = "",
}: Pick<
  CifradoCompasToolPanelProps,
  | "cycleGolpes"
  | "onCycleGolpesChange"
  | "intensidadPattern"
  | "onCycleIntensidadSlot"
  | "showClearIntensidadSelection"
  | "onClearIntensidadSelection"
> & { sectionLabelClass: string; fluidIntensidad?: boolean; className?: string }) {
  return (
    <div className={`${CIFRADO_EDITOR_CYCLE_TOOL_BOX_CLASS} ${className}`.trim()}>
      <div className="flex min-w-0 items-end gap-x-5">
        <CifradoCompasTypeStepper
          cycleGolpes={cycleGolpes}
          onCycleGolpesChange={onCycleGolpesChange}
          labelClass={sectionLabelClass}
        />

        <div className={fluidIntensidad ? "min-w-0 flex-1" : "shrink-0"}>
          <p className={sectionLabelClass}>{RITMO_LABEL_INTENSIDAD}</p>
          <div className="mt-1.5 min-w-0">
            <CifradoIntensidadPatternRow
              pattern={intensidadPattern}
              onCycleSlot={onCycleIntensidadSlot}
              showClearSelection={showClearIntensidadSelection}
              onClearSelection={onClearIntensidadSelection}
              fluid={fluidIntensidad}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GuardadoCycleControls({
  activeCycleId,
  savedCycles,
  cyclesLoading,
  onRefreshCycles,
  onSelectSavedCycle,
  sectionLabelClass,
  className = "",
}: Pick<
  CifradoCompasToolPanelProps,
  | "activeCycleId"
  | "savedCycles"
  | "cyclesLoading"
  | "onRefreshCycles"
  | "onSelectSavedCycle"
> & { sectionLabelClass: string; className?: string }) {
  return (
    <div
      className={`${CIFRADO_EDITOR_CYCLE_TOOL_BOX_CLASS} min-w-[min(100%,18rem)] ${className}`.trim()}
    >
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className={sectionLabelClass}>{CIFRADO_LABEL_CICLOS_GUARDADOS}</span>
          <select
            value={activeCycleId ?? ""}
            disabled={cyclesLoading}
            onChange={(event) => {
              const next = event.target.value;
              onSelectSavedCycle(next ? next : null);
            }}
            className={`mt-1.5 w-full rounded-[10px] border bg-bg-darker px-3 py-2 text-xs font-semibold text-text-primary outline-none focus:border-compositor-config disabled:opacity-50 ${
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
    </div>
  );
}

function CompasToolTabs({
  tab,
  onTabChange,
  variant,
}: Pick<CifradoCompasToolPanelProps, "tab" | "onTabChange" | "variant">) {
  const tabClass =
    variant === "desktop"
      ? cifradoEditorPcTabClass
      : cifradoEditorToolbarSegmentedButtonClass;

  return (
    <div
      className={
        variant === "desktop"
          ? "inline-flex gap-1 rounded-full border border-border/80 bg-bg-dark p-0.5"
          : "flex gap-1 rounded-full border border-border bg-bg-darker p-0.5"
      }
      role="tablist"
      aria-label="Herramienta de compás"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "componer"}
        onClick={() => onTabChange("componer")}
        className={tabClass(tab === "componer")}
      >
        {CIFRADO_LABEL_COMPONER_CICLO}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "guardado"}
        onClick={() => onTabChange("guardado")}
        className={tabClass(tab === "guardado")}
      >
        {CIFRADO_LABEL_CICLO_GUARDADO}
      </button>
    </div>
  );
}

function PlacementCycleControls({
  placementCycleCount,
  onPlacementCycleCountChange,
  onApplyCyclesToAllLines,
  variant,
}: Pick<
  CifradoCompasToolPanelProps,
  | "placementCycleCount"
  | "onPlacementCycleCountChange"
  | "onApplyCyclesToAllLines"
  | "variant"
>) {
  const labelClass =
    variant === "desktop"
      ? ritmoDesktopSectionTitleClass("compositor")
      : CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS;

  if (variant === "desktop") {
    return (
      <div className="flex shrink-0 items-stretch pl-4">
        <span className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />

        <div className="flex items-end pl-4">
          <div className="min-w-[8.5rem]">
            <p className={labelClass}>{CIFRADO_LABEL_APLICAR_NUMERO_CICLOS}</p>
            <ToolNumericStepper
              value={placementCycleCount}
              density="compact"
              decrementDisabled={placementCycleCount <= 1}
              incrementDisabled={
                placementCycleCount >= MAX_COMPAS_PLACEMENT_CYCLE_COUNT
              }
              decrementAriaLabel="Reducir ciclos"
              incrementAriaLabel="Aumentar ciclos"
              inputId="cifrado-placement-cycle-count"
              min={1}
              max={MAX_COMPAS_PLACEMENT_CYCLE_COUNT}
              onDecrement={() =>
                onPlacementCycleCountChange(Math.max(1, placementCycleCount - 1))
              }
              onIncrement={() =>
                onPlacementCycleCountChange(
                  Math.min(
                    MAX_COMPAS_PLACEMENT_CYCLE_COUNT,
                    placementCycleCount + 1,
                  ),
                )
              }
              onSetValue={(value) =>
                onPlacementCycleCountChange(
                  Math.min(
                    MAX_COMPAS_PLACEMENT_CYCLE_COUNT,
                    Math.max(1, value),
                  ),
                )
              }
            />
          </div>
        </div>

        <span
          className="mx-4 w-px shrink-0 self-stretch bg-border"
          aria-hidden="true"
        />

        <div className="flex items-end">
          <TapButton
            type="button"
            onClick={onApplyCyclesToAllLines}
            className="shrink-0 rounded-[10px] border border-border bg-bg-card px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-dark/60"
          >
            {CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES}
          </TapButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-dashed border-border/90 pt-2">
      <label className="block" htmlFor="cifrado-placement-cycle-count">
        <span className={labelClass}>{CIFRADO_LABEL_APLICAR_NUMERO_CICLOS}</span>
        <input
          id="cifrado-placement-cycle-count"
          type="number"
          min={1}
          max={MAX_COMPAS_PLACEMENT_CYCLE_COUNT}
          value={placementCycleCount}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);

            if (!Number.isFinite(parsed)) {
              return;
            }

            onPlacementCycleCountChange(
              Math.min(MAX_COMPAS_PLACEMENT_CYCLE_COUNT, Math.max(1, parsed)),
            );
          }}
          className={`${CIFRADO_CONTROLS_INPUT_CLASS} mt-1 w-full text-center text-xs font-semibold`}
        />
      </label>

      <p className="text-[11px] leading-snug text-text-muted">
        {CIFRADO_HELP_APLICAR_NUMERO_CICLOS}
      </p>

      <TapButton
        type="button"
        onClick={onApplyCyclesToAllLines}
        className={`${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS} text-xs`}
      >
        {CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES}
      </TapButton>
    </div>
  );
}

export function CifradoCompasToolPanel({
  tab,
  onTabChange,
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
  variant = "mobile",
}: CifradoCompasToolPanelProps) {
  const sectionLabelClass =
    variant === "desktop"
      ? ritmoDesktopSectionTitleClass("compositor")
      : CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS;

  if (variant === "desktop") {
    return (
      <div className="flex min-w-0 w-full flex-col items-start gap-2">
        <CompasToolTabs tab={tab} onTabChange={onTabChange} variant={variant} />

        <div className="flex min-w-0 w-full items-stretch">
          {tab === "guardado" ? (
            <GuardadoCycleControls
              activeCycleId={activeCycleId}
              savedCycles={savedCycles}
              cyclesLoading={cyclesLoading}
              onRefreshCycles={onRefreshCycles}
              onSelectSavedCycle={onSelectSavedCycle}
              sectionLabelClass={sectionLabelClass}
              className="min-w-0 flex-1"
            />
          ) : (
            <ComponerCycleControls
              cycleGolpes={cycleGolpes}
              onCycleGolpesChange={onCycleGolpesChange}
              intensidadPattern={intensidadPattern}
              onCycleIntensidadSlot={onCycleIntensidadSlot}
              showClearIntensidadSelection={showClearIntensidadSelection}
              onClearIntensidadSelection={onClearIntensidadSelection}
              sectionLabelClass={sectionLabelClass}
              fluidIntensidad
              className="min-w-0 flex-1"
            />
          )}

          <PlacementCycleControls
            placementCycleCount={placementCycleCount}
            onPlacementCycleCountChange={onPlacementCycleCountChange}
            onApplyCyclesToAllLines={onApplyCyclesToAllLines}
            variant={variant}
          />
        </div>

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

  return (
    <div className="space-y-2">
      <CompasToolTabs tab={tab} onTabChange={onTabChange} variant={variant} />

      {tab === "guardado" ? (
        <GuardadoCycleControls
          activeCycleId={activeCycleId}
          savedCycles={savedCycles}
          cyclesLoading={cyclesLoading}
          onRefreshCycles={onRefreshCycles}
          onSelectSavedCycle={onSelectSavedCycle}
          sectionLabelClass={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}
        />
      ) : (
        <ComponerCycleControls
          cycleGolpes={cycleGolpes}
          onCycleGolpesChange={onCycleGolpesChange}
          intensidadPattern={intensidadPattern}
          onCycleIntensidadSlot={onCycleIntensidadSlot}
          showClearIntensidadSelection={showClearIntensidadSelection}
          onClearIntensidadSelection={onClearIntensidadSelection}
          sectionLabelClass={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}
        />
      )}

      {cyclesError ? (
        <p className="text-[11px] text-[var(--tuner-lejos)]">{cyclesError}</p>
      ) : null}

      {!cyclesLoading && tab === "guardado" && savedCycles.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          No hay ciclos guardados. Creá uno en el Compositor.
        </p>
      ) : null}

      <PlacementCycleControls
        placementCycleCount={placementCycleCount}
        onPlacementCycleCountChange={onPlacementCycleCountChange}
        onApplyCyclesToAllLines={onApplyCyclesToAllLines}
        variant={variant}
      />
    </div>
  );
}
