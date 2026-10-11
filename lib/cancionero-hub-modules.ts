import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  FileText,
  Gauge,
  MicVocal,
  Music2,
  Plus,
  Star,
  Timer,
} from "lucide-react";

export type HubModuleKind =
  | "route"
  | "afinador"
  | "metronomo"
  | "voz"
  | "compositor";

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
  requiresOwner?: boolean;
  /** Dueño y amigos: pueden sumar una canción nueva. */
  requiresCreator?: boolean;
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
    id: "sumar-cancion",
    label: "Sumar canción",
    icon: Plus,
    accentVar: "--accent-editor",
    accentDimVar: "--accent-editor-dim",
    iconColor: "var(--accent-editor)",
    kind: "route",
    section: "canciones",
    href: "/canciones/editor?desde=hub",
    requiresAuth: true,
    requiresCreator: true,
    ctaLabel: "Crear",
    ctaVariant: "neutral",
    ctaMode: "soft",
    ctaTextTone: "accent",
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
    requiresOwner: true,
    ctaLabel: "Abrir",
    ctaVariant: "accent",
    ctaMode: "solid",
    ctaTextTone: "on-light",
  },
  {
    id: "entrenador-canciones",
    label: "Entrenador de canciones",
    icon: Star,
    accentVar: "--accent-entrenador-canciones",
    accentDimVar: "--accent-entrenador-canciones-dim",
    iconColor: "var(--accent-vocal)",
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
