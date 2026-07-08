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
      className="flex h-full min-h-0 w-[11.5rem] shrink-0 flex-col gap-3 self-stretch border-r border-border/80 bg-bg-darker/40 p-3"
      aria-label="Modos del entrenador vocal"
    >
      {VOZ_MODE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
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
                    className={`rounded-lg px-2.5 py-2 text-left text-[11px] font-bold leading-tight transition-colors ${
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
