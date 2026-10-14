"use client";

import {
  VOZ_MODE_SLIDES,
  type VozModeSlideId,
} from "@/components/ui/entrenador-vocal/voz-mode-slides";

const VOZ_MODE_GROUPS = [
  { label: "Tono", startIndex: 0, endIndex: 3 },
  { label: "Ritmo + voz", startIndex: 4, endIndex: 7 },
] as const;

export function VozPcModeNav({
  activeIndex,
  onChangeIndex,
}: {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
}) {
  const activeId = VOZ_MODE_SLIDES[activeIndex]?.id ?? "encajar";

  return (
    <nav
      className="flex shrink-0 items-center gap-5 overflow-x-auto border-b border-border/80 bg-bg-darker/40 px-3 py-2"
      aria-label="Modos del entrenador vocal"
    >
      {VOZ_MODE_GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 items-center gap-2">
          <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {group.label}
          </p>
          <div className="flex gap-1" role="tablist" aria-label={group.label}>
            {VOZ_MODE_SLIDES.slice(group.startIndex, group.endIndex + 1).map(
              (slide, offset) => {
                const index = group.startIndex + offset;
                const isActive = activeId === slide.id;

                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChangeIndex(index)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold leading-tight transition-colors ${
                      isActive
                        ? "bg-voz-config text-white shadow-sm"
                        : "text-text-muted hover:bg-bg-card/80 hover:text-text-primary"
                    }`}
                  >
                    {slide.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

export type { VozModeSlideId } from "@/components/ui/entrenador-vocal/voz-mode-slides";
