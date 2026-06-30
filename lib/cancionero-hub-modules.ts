import type { LucideIcon } from "lucide-react";
import { Bookmark, FileText, Gauge, MicVocal, Timer } from "lucide-react";

export type HubModuleKind = "route" | "afinador" | "metronomo" | "voz";

export type HubModuleDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: HubModuleKind;
  href?: string;
  requiresAuth?: boolean;
  ctaLabel?: string;
  ctaVariant?: "neutral" | "accent";
  iconColor?: string;
};

export const CANCIONERO_HUB_MODULES: HubModuleDef[] = [
  {
    id: "cancionero",
    label: "Cancionero",
    icon: FileText,
    iconColor: "#9AE0C8",
    kind: "route",
    href: "/cancionero/global",
    ctaLabel: "Ver",
    ctaVariant: "neutral",
  },
  {
    id: "mis-canciones",
    label: "Mis canciones",
    icon: Bookmark,
    iconColor: "var(--accent)",
    kind: "route",
    href: "/cancionero/mis-canciones",
    requiresAuth: true,
    ctaLabel: "Ver",
    ctaVariant: "neutral",
  },
  {
    id: "afinador",
    label: "Afinador",
    icon: Gauge,
    iconColor: "var(--tuner-in-tune)",
    kind: "afinador",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "metronomo",
    label: "Metrónomo",
    icon: Timer,
    iconColor: "var(--tuner-cerca)",
    kind: "metronomo",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "entrenador-vocal",
    label: "Entrenador Vocal",
    icon: MicVocal,
    iconColor: "var(--voz-config)",
    kind: "voz",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
];
