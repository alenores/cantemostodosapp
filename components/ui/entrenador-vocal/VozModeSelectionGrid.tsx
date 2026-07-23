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
  const tonoCards = VOZ_MODE_CARDS.filter((c) => c.group === "tono");
  const ritmoCards = VOZ_MODE_CARDS.filter((c) => c.group === "ritmo");

  const getBadgeStyle = (badge: VozModeCardDef["badge"]) => {
    switch (badge) {
      case "Básico":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Intermedio":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Avanzado":
      case "Desafío":
        return "bg-accent-vocal/15 text-accent-vocal border-accent-vocal/30";
      default:
        return "bg-text-muted/10 text-text-muted border-text-muted/20";
    }
  };

  const renderCardGroup = (title: string, cards: VozModeCardDef[], isRitmo = false) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div
          className={`size-2.5 rounded-full ${
            isRitmo ? "bg-accent-vocal" : "bg-sky-400"
          }`}
        />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
          {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <TapButton
              key={card.id}
              onClick={() => onSelectMode(card.id)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-amplio border p-4 text-left transition-all duration-150 active:scale-[0.98] ${
                isRitmo
                  ? "border-accent-vocal/20 bg-bg-card hover:border-accent-vocal/40 hover:bg-accent-vocal/5"
                  : "border-sky-500/20 bg-bg-card hover:border-sky-500/40 hover:bg-sky-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                    isRitmo
                      ? "border-accent-vocal/30 bg-accent-vocal/10 text-accent-vocal"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-400"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getBadgeStyle(
                    card.badge,
                  )}`}
                >
                  {card.badge}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <h4 className="text-base font-bold text-text-primary group-hover:text-text-primary">
                  {card.label}
                </h4>
                <p className="text-xs leading-relaxed text-text-muted">
                  {card.description}
                </p>
              </div>
            </TapButton>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8 pt-1">
      <div className="space-y-1 px-1">
        <h2 className="text-xl font-extrabold text-text-primary sm:text-2xl">
          Modos de Práctica Vocal
        </h2>
        <p className="text-sm text-text-muted">
          Elegí un ejercicio para entrenar tu voz a pantalla completa.
        </p>
      </div>

      {renderCardGroup("Entrenamiento de Tono", tonoCards, false)}
      {renderCardGroup("Ritmo y Control Vocal", ritmoCards, true)}
    </div>
  );
}
