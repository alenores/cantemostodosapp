import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  FileText,
  Gauge,
  MicVocal,
  Music2,
  NotebookPen,
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

export type HubCtaMode = "soft" | "solid";
export type HubCtaTextTone = "accent" | "white" | "on-light";

export type HubModuleDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: HubModuleKind;
  section: HubModuleSection;
  href?: string;
  requiresAuth?: boolean;
  ctaLabel?: string;
  /** @deprecated Prefer ctaMode; kept for callers that still branch on accent/neutral. */
  ctaVariant?: "neutral" | "accent";
  accentVar: string;
  accentDimVar: string;
  ctaMode: HubCtaMode;
  ctaTextTone: HubCtaTextTone;
  iconColor?: string;
  comingSoon?: boolean;
  desktopOnly?: boolean;
};

export const CANCIONERO_HUB_MODULES: HubModuleDef[] = [
  {
    id: "cancionero",
    label: "Cancionero",
    icon: FileText,
    accentVar: "--accent-cancionero",
    accentDimVar: "--accent-cancionero-dim",
    iconColor: "var(--accent-cancionero)",
    kind: "route",
    section: "canciones",
    href: "/canciones/cancionero",
    ctaLabel: "Ver",
    ctaVariant: "neutral",
    ctaMode: "soft",
    ctaTextTone: "accent",
  },
  {
    id: "mis-canciones",
    label: "Favoritas",
    icon: Bookmark,
    accentVar: "--accent",
    accentDimVar: "--accent-dim",
    iconColor: "var(--accent)",
    kind: "route",
    section: "canciones",
    href: "/canciones/favoritas",
    requiresAuth: true,
    ctaLabel: "Ver",
    ctaVariant: "neutral",
    ctaMode: "soft",
    ctaTextTone: "accent",
  },
  {
    id: "editor-canciones",
    label: "Editor de canciones",
    icon: Pencil,
    accentVar: "--accent-editor",
    accentDimVar: "--accent-editor-dim",
    iconColor: "var(--accent-editor)",
    kind: "editor-canciones",
    section: "canciones",
    href: "/canciones/editor",
    requiresAuth: true,
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "on-light",
  },
  {
    id: "afinador",
    label: "Afinador",
    icon: Gauge,
    accentVar: "--accent-afinador",
    accentDimVar: "--accent-afinador-dim",
    iconColor: "var(--accent-afinador)",
    kind: "afinador",
    section: "herramientas",
    href: "/herramientas/afinador",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "white",
  },
  {
    id: "metronomo",
    label: "Metrónomo",
    icon: Timer,
    accentVar: "--accent-metronomo",
    accentDimVar: "--accent-metronomo-dim",
    iconColor: "var(--accent-metronomo)",
    kind: "metronomo",
    section: "practica",
    href: "/practica/metronomo",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "on-light",
  },
  {
    id: "entrenador-vocal",
    label: "Entrenador Vocal",
    icon: MicVocal,
    accentVar: "--accent-vocal",
    accentDimVar: "--accent-vocal-dim",
    iconColor: "var(--accent-vocal)",
    kind: "voz",
    section: "practica",
    href: "/practica/entrenador-vocal",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "white",
  },
  {
    id: "compositor",
    label: "Compositor",
    icon: Music2,
    accentVar: "--accent-compositor",
    accentDimVar: "--accent-compositor-dim",
    iconColor: "var(--accent-compositor)",
    kind: "compositor",
    section: "practica",
    href: "/practica/compositor",
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "on-light",
  },
  {
    id: "entrenador-canciones",
    label: "Entrenador de canciones",
    icon: NotebookPen,
    accentVar: "--accent-entrenador-canciones",
    accentDimVar: "--accent-entrenador-canciones-dim",
    iconColor: "var(--accent-entrenador-canciones)",
    kind: "route",
    section: "practica",
    href: "/practica/entrenador-canciones",
    requiresAuth: true,
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "on-light",
  },
];
