"use client";

import {
  COMPOSITOR_TAB_BATERIA,
  COMPOSITOR_TAB_CICLO,
  COMPOSITOR_TAB_MELODIAS,
  COMPOSITOR_TAB_TEMPO,
  COMPOSITOR_TAB_TONALIDAD,
} from "@/lib/ritmo-terminologia";
import type { ReactNode } from "react";

export type CompositorEditorTab =
  | "ciclo"
  | "tempo"
  | "bateria"
  | "tonalidad"
  | "melodias";

const COMPOSITOR_EDITOR_TABS: Array<{
  id: CompositorEditorTab;
  label: string;
}> = [
  { id: "ciclo", label: COMPOSITOR_TAB_CICLO },
  { id: "tempo", label: COMPOSITOR_TAB_TEMPO },
  { id: "bateria", label: COMPOSITOR_TAB_BATERIA },
  { id: "tonalidad", label: COMPOSITOR_TAB_TONALIDAD },
  { id: "melodias", label: COMPOSITOR_TAB_MELODIAS },
];

type CompositorEditorTabShellProps = {
  activeTab: CompositorEditorTab;
  disabled?: boolean;
  summary: string;
  onTabChange: (tab: CompositorEditorTab) => void;
  children: ReactNode;
};

export function CompositorEditorTabShell({
  activeTab,
  disabled = false,
  summary,
  onTabChange,
  children,
}: CompositorEditorTabShellProps) {
  const activeIndex = COMPOSITOR_EDITOR_TABS.findIndex(
    (tab) => tab.id === activeTab,
  );

  return (
    <div className="min-w-0">
      <div
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Editor del compositor"
      >
        <div className="flex min-w-max items-end gap-px">
          {COMPOSITOR_EDITOR_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`compositor-tab-${tab.id}`}
                aria-selected={isActive}
                disabled={disabled}
                onClick={() => onTabChange(tab.id)}
                className={
                  isActive
                    ? "relative z-10 -mb-px shrink-0 rounded-t-[10px] border border-b-0 border-compositor-config-border bg-compositor-config-bg px-3 py-2 text-[11px] font-bold leading-none text-compositor-config disabled:opacity-50"
                    : "mb-px shrink-0 rounded-t-[8px] border border-border border-b-compositor-config-border bg-bg-darker px-2.5 py-1.5 text-[11px] font-bold leading-none text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`compositor-tab-${activeTab}`}
        className={`border border-compositor-config-border bg-compositor-config-bg px-3 py-2.5 ${
          activeIndex === 0 ? "rounded-tl-none" : "rounded-tl-[12px]"
        } ${
          activeIndex === COMPOSITOR_EDITOR_TABS.length - 1
            ? "rounded-tr-none"
            : "rounded-tr-[12px]"
        } rounded-b-[12px]`}
      >
        <p className="mb-2 truncate text-[10px] leading-snug text-text-muted">
          {summary}
        </p>
        {children}
      </div>
    </div>
  );
}

export { COMPOSITOR_EDITOR_TABS };
