"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { VozModeSlideId } from "@/components/ui/entrenador-vocal/voz-mode-slides";
import {
  Activity,
  Clock,
  Crown,
  Mic,
  Music,
  Target,
  Timer,
  Volume2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VozModeCardDef = {
  id: VozModeSlideId;
  label: string;
  group: "tono" | "ritmo";
  groupLabel: string;
  icon: LucideIcon;
  description: string;
  badge: "Básico" | "Intermedio" | "Avanzado" | "Desafío";
};

export const VOZ_MODE_CARDS: VozModeCardDef[] = [
  // --- GRUPO TONO ---
  {
    id: "encajar",
    label: "Encajar",
    group: "tono",
    groupLabel: "Tono y Afinación",
    icon: Target,
    description: "Afinar notas cortas con precisión al cantar.",
    badge: "Básico",
  },
  {
    id: "sostener",
    label: "Sostener",
    group: "tono",
    groupLabel: "Tono y Afinación",
    icon: Timer,
    description: "Mantener una nota afinada y estable en el tiempo.",
    badge: "Básico",
  },
  {
    id: "octavas",
    label: "Octavas",
    group: "tono",
    groupLabel: "Tono y Afinación",
    icon: Activity,
    description: "Practicar saltos limpios entre distintas octavas.",
    badge: "Intermedio",
  },
  {
    id: "melodia",
    label: "Melodía",
    group: "tono",
    groupLabel: "Tono y Afinación",
    icon: Music,
    description: "Cantar secuencias de notas a tiempo uniforme.",
    badge: "Intermedio",
  },

  // --- GRUPO RITMO Y VOZ ---
  {
    id: "ritmo",
    label: "Ritmo",
    group: "ritmo",
    groupLabel: "Ritmo y Control Vocal",
    icon: Clock,
    description: "Entrenar precisión rítmica sin evaluar el tono.",
    badge: "Básico",
  },
  {
    id: "ritmo-intensidad",
    label: "Ritmo-Intensidad",
    group: "ritmo",
    groupLabel: "Ritmo y Control Vocal",
    icon: Volume2,
    description: "Controlar el volumen y la fuerza del canto en cada golpe.",
    badge: "Intermedio",
  },
  {
    id: "ritmo-nota",
    label: "Ritmo-Nota",
    group: "ritmo",
    groupLabel: "Ritmo y Control Vocal",
    icon: Mic,
    description: "Cantar un patrón rítmico manteniendo una nota fija.",
    badge: "Intermedio",
  },
  {
    id: "combo",
    label: "Combo",
    group: "ritmo",
    groupLabel: "Ritmo y Control Vocal",
    icon: Crown,
    description: "Patrón rítmico con afinación e intensidad variable.",
    badge: "Desafío",
  },
];

type VozModeSelectionGridProps = {
  onSelectMode: (modeId: VozModeSlideId) => void;
};

export function VozModeSelectionGrid({ onSelectMode }: VozModeSelectionGridProps) {
  const getBadgeStyle = (badge: VozModeCardDef["badge"]) => {
    switch (badge) {
      case "Básico":
        return "text-[#8fd0a4]";
      case "Intermedio":
        return "text-[#e4c56a]";
      case "Avanzado":
      case "Desafío":
        return "text-[#8ec4e6]";
      default:
        return "text-text-muted";
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-3">
      <div className="home-inicio-saludo flex flex-col items-center text-center">
        <h2 className="text-[22px] font-bold leading-[1.5] tracking-tight text-[#1c1c1e]">
          <span className="home-inicio-saludo__linea">Modos de Práctica Vocal</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {VOZ_MODE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <TapButton
              key={card.id}
              onClick={() => onSelectMode(card.id)}
              className="home-destination-card relative flex min-h-[190px] w-full flex-col items-center justify-between gap-3 rounded-[28px] px-3 py-6 text-center"
            >
              <span className="flex flex-1 items-center justify-center text-white" aria-hidden="true">
                <Icon className="size-[52px]" strokeWidth={2.2} />
              </span>
              <span className="block min-h-[2.5em] w-full text-[15px] font-extrabold uppercase leading-tight tracking-[0.015em] text-text-primary">
                {card.label}
              </span>
              <span className="block w-full text-[13px] font-normal leading-tight text-text-muted">
                {card.description}
              </span>
              <span className={`block w-full text-[13px] font-semibold leading-tight ${getBadgeStyle(card.badge)}`}>
                {card.badge}
              </span>
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}
