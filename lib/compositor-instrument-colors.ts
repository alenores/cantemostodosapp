import type {
  CompositorGuitarArticulation,
  CompositorInstrumentId,
} from "@/lib/compositor";

/** Clases Tailwind para tabs de capa (misma paleta que los bloques del timeline). */
export const COMPOSITOR_CAPA_TAB_ACTIVE_CLASS: Record<
  CompositorInstrumentId,
  string
> = {
  piano: "bg-compositor-block-piano text-white",
  guitarra: "bg-compositor-block-guitarra text-[#1a1408]",
  bateria: "bg-compositor-block-bateria text-white",
  viento: "bg-compositor-block-viento text-white",
};

export function getCompositorTimelineBlockClassName({
  instrumentId,
  isSelected,
  isDragging = false,
  guitarArticulation,
  drumSilencio = false,
  mini = false,
}: {
  instrumentId: CompositorInstrumentId;
  isSelected: boolean;
  isDragging?: boolean;
  guitarArticulation?: CompositorGuitarArticulation;
  drumSilencio?: boolean;
  mini?: boolean;
}): string {
  const classes = [
    "compositor-timeline-block",
    `compositor-timeline-block--${instrumentId}`,
  ];

  if (mini) {
    classes.push("compositor-timeline-block--mini");
  }

  if (instrumentId === "guitarra" && guitarArticulation) {
    classes.push(`compositor-timeline-block--guitar-${guitarArticulation}`);
  }

  if (instrumentId === "bateria" && drumSilencio) {
    classes.push("compositor-timeline-block--drum-silencio");
  }

  if (isSelected) {
    classes.push("compositor-timeline-block--selected");
  }

  if (isDragging) {
    classes.push("compositor-timeline-block--dragging");
  }

  return classes.join(" ");
}
