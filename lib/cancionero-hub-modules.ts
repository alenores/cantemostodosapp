import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  FileText,
  Gauge,
  MicVocal,
  Music2,
  Pencil,
  Timer,
} from "lucide-react";

export type HubModuleKind =
  | "route"
  | "afinador"
  | "metronomo"
  | "voz"
  | "compositor"
  | "editor-canciones";

export type HubModuleSection = "canciones" | "herramientas" | "practica";

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
  desktopOnly?: boolean;
};

export const CANCIONERO_HUB_MODULES: HubModuleDef[] = [
  {
    id: "cancionero",
    label: "Cancionero",
    icon: FileText,
    iconColor: "var(--cancionero-icon)",
    kind: "route",
    section: "canciones",
    href: "/canciones/cancionero",
    ctaLabel: "Ver",
    ctaVariant: "neutral",
  },
  {
    id: "mis-canciones",
    label: "Favoritas",
    icon: Bookmark,
    iconColor: "var(--accent)",
    kind: "route",
    section: "canciones",
    href: "/canciones/favoritas",
    requiresAuth: true,
    ctaLabel: "Ver",
    ctaVariant: "neutral",
  },
  {
    id: "editor-canciones",
    label: "Editor de canciones",
    icon: Pencil,
    iconColor: "var(--tuner-cerca)",
    kind: "editor-canciones",
    section: "canciones",
    href: "/canciones/editor",
    requiresAuth: true,
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "afinador",
    label: "Afinador",
    icon: Gauge,
    iconColor: "var(--tuner-in-tune)",
    kind: "afinador",
    section: "herramientas",
    href: "/herramientas/afinador",
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
    href: "/practica/metronomo",
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
    href: "/practica/entrenador-vocal",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
  {
    id: "compositor",
    label: "Compositor",
    icon: Music2,
    iconColor: "var(--voz-config)",
    kind: "compositor",
    section: "practica",
    href: "/practica/compositor",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
  },
];
