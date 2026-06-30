import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  FileText,
  Gauge,
  MicVocal,
  Music2,
  Timer,
} from "lucide-react";

export type HubModuleKind =
  | "route"
  | "afinador"
  | "metronomo"
  | "voz"
  | "compositor";

export type HubModuleSection = "canciones" | "practica";

export type HubModuleDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: HubModuleKind;
  section: HubModuleSection;
  href?: string;
  requiresAuth?: boolean;
  ctaLabel?: string;
  ctaVariant?: "neutral" | "accent";
  iconColor?: string;
  comingSoon?: boolean;
};

export const CANCIONERO_HUB_MODULES: HubModuleDef[] = [
  {
    id: "cancionero",
    label: "Cancionero",
    icon: FileText,
    iconColor: "#9AE0C8",
    kind: "route",
    section: "canciones",
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
    section: "canciones",
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
    section: "practica",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "metronomo",
    label: "Metrónomo",
    icon: Timer,
    iconColor: "var(--tuner-cerca)",
    kind: "metronomo",
    section: "practica",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "entrenador-vocal",
    label: "Entrenador Vocal",
    icon: MicVocal,
    iconColor: "var(--voz-config)",
    kind: "voz",
    section: "practica",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "compositor",
    label: "Compositor",
    icon: Music2,
    iconColor: "var(--compositor-config)",
    kind: "compositor",
    section: "practica",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
];
