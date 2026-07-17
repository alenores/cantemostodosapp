"use client";

import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import {
  COMPOSITOR_TAB_BATERIA,
  COMPOSITOR_TAB_CICLO,
  COMPOSITOR_TAB_MELODIAS,
  COMPOSITOR_TAB_PRACTICAR,
} from "@/lib/ritmo-terminologia";
import { forwardVerticalWheel } from "@/lib/forward-vertical-wheel";
import { COMPOSITOR_SEGMENTED_TAB_ACTIVE_CLASS } from "@/lib/compositor-ui";
import type { ReactNode } from "react";


export type CompositorEditorTab =

  | "ciclo"

  | "bateria"

  | "melodias"

  | "practicar";



const COMPOSITOR_EDITOR_TABS: Array<{

  id: CompositorEditorTab;

  label: string;

  practice?: boolean;

}> = [

  { id: "ciclo", label: COMPOSITOR_TAB_CICLO },

  { id: "bateria", label: COMPOSITOR_TAB_BATERIA },

  { id: "melodias", label: COMPOSITOR_TAB_MELODIAS },
];


function compositorTabButtonClass(isActive: boolean, practiceTab: boolean) {

  if (isActive) {

    return practiceTab

      ? "bg-tool-practice/18 text-tool-practice ring-1 ring-inset ring-tool-practice/25"

      : COMPOSITOR_SEGMENTED_TAB_ACTIVE_CLASS;

  }



  return practiceTab

    ? "text-text-muted hover:bg-bg-card/60 hover:text-tool-practice/80"

    : "text-text-muted hover:bg-bg-card/60 hover:text-text-primary";

}



type CompositorEditorTabShellProps = {
  activeTab: CompositorEditorTab;
  disabled?: boolean;
  summary: string;
  onTabChange: (tab: CompositorEditorTab) => void;
  onOpenPractice: () => void;
  children: ReactNode;
};


export function CompositorEditorTabShell({
  activeTab,
  disabled = false,
  summary,
  onTabChange,
  onOpenPractice,
  children,
}: CompositorEditorTabShellProps) {
  const isPractice = activeTab === "practicar";

  return (
    <div className="compositor-editor-shell min-w-0 overflow-hidden rounded-[12px] border border-border bg-bg-card shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
      <div className="border-b border-border/80 bg-bg-darker px-2.5 py-2.5 sm:px-3">
        <div className="flex items-center gap-2">
          <div
            className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onWheel={forwardVerticalWheel}
            role="tablist"
            aria-label="Editor del compositor"
          >
            <div className="inline-flex min-w-max items-center gap-0.5 rounded-full border border-border/80 bg-bg-dark p-0.5">
              {COMPOSITOR_EDITOR_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const practiceTab = tab.practice === true;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`compositor-tab-${tab.id}`}
                    aria-selected={isActive}
                    disabled={disabled}
                    onClick={() => onTabChange(tab.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold leading-none transition-[color,background-color,box-shadow] disabled:opacity-50 sm:px-3.5 ${compositorTabButtonClass(isActive, practiceTab)}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!isPractice ? (
            <PlayCircleButton
              size="xs"
              playOnly
              disabled={disabled}
              onClick={onOpenPractice}
              playAriaLabel={COMPOSITOR_TAB_PRACTICAR}
              className="border-border text-tool-practice"
            />
          ) : null}
        </div>
      </div>


      <div
        role="tabpanel"
        aria-labelledby={isPractice ? undefined : `compositor-tab-${activeTab}`}
        aria-label={isPractice ? COMPOSITOR_TAB_PRACTICAR : undefined}
        className={`compositor-tab-content px-3 py-3 sm:px-4 sm:py-3.5 ${
          isPractice

            ? "bg-[var(--tool-practice-section-bg)]"

            : "bg-[color-mix(in_srgb,var(--compositor-config)_7%,var(--bg-card))]"

        }`}

      >

        {summary ? (
          <div
            className={`mb-3 flex items-center gap-2 border-b pb-2.5 ${
              isPractice ? "border-tool-practice/20" : "border-compositor-config/18"
            }`}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                isPractice ? "bg-tool-practice" : "bg-compositor-config"
              }`}
              aria-hidden="true"
            />
            <p className="min-w-0 truncate text-[11px] font-medium leading-snug text-text-secondary">
              {summary}
            </p>
          </div>
        ) : null}

        {children}

      </div>

    </div>

  );

}



export { COMPOSITOR_EDITOR_TABS };


