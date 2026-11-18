"use client";

import {
  LecturaFabOption,
  type LecturaFabItem,
  type LecturaFabStep,
} from "@/components/home/LecturaFabOption";
import { normalizeNotaIndex, type NotaIndex } from "@/lib/cifrado";
import {
  LETRA_ZOOM_MAX_LEVEL,
  LETRA_ZOOM_MIN_LEVEL,
  type LetraZoomLevel,
} from "@/lib/letra-zoom";
import { getLecturaFabMenuTopCss } from "@/lib/sala-layout";
import {
  AudioLines,
  Eye,
  EyeOff,
  Minimize2,
  Music,
  Music2,
  Type,
  Palette,
} from "lucide-react";

type ResolvedItem = LecturaFabItem & { closeOnClick: boolean };

function letraZoomStep(
  size: "chica" | "grande",
  ariaLabel: string,
  onClick: () => void,
  disabled: boolean,
): LecturaFabStep {
  return {
    content: (
      <span
        className={`font-bold leading-none ${size === "chica" ? "text-[11px]" : "text-[20px]"}`}
        aria-hidden="true"
      >
        A
      </span>
    ),
    ariaLabel,
    onClick,
    disabled,
  };
}

type ModoLecturaOverlayProps = {
  abierto: boolean;
  fixedRightCss: string;
  /** Oculta backdrop y menú en desktop (p. ej. cancionero). */
  mobileOnly?: boolean;
  showContraerOption?: boolean;
  menuTopCss?: string;
  /** Bloque del medio propio de cada pantalla (buscar/fila o anterior/siguiente). */
  navItems?: LecturaFabItem[];
  /** Ítems extra al final (p. ej. canto: anotaciones, nota, editar). */
  extraItems?: LecturaFabItem[];
  hasCompases?: boolean;
  compasesOcultos?: boolean;
  acordesOcultos?: boolean;
  showAcordesOption?: boolean;
  showOcultarElementosOption?: boolean;
  showTonoOption?: boolean;
  showZoomOption?: boolean;
  showAfinador?: boolean;
  onCerrar: () => void;
  onContraer: () => void;
  onActivarCompases?: () => void;
  onToggleAcordesOcultos?: () => void;
  onAbrirOcultarElementos?: () => void;
  onAbrirTono?: () => void;
  onAbrirZoom?: () => void;
  /** Tono actual. Con onTonalidadChange, el menú muestra − y + al lado. */
  tonalidadIndex?: NotaIndex | null;
  onTonalidadChange?: (next: NotaIndex) => void;
  zoomLevel?: LetraZoomLevel;
  zoomEnabled?: boolean;
  onZoomDecrease?: () => void;
  onZoomIncrease?: () => void;
  onAfinador?: () => void;
  temaLectura?: "dia" | "sepia" | "escenario";
  onTemaLecturaChange?: (next: "dia" | "sepia" | "escenario") => void;
};

/** Menú flotante de controles de modo lectura (celular). Compartido por las pantallas. */
export default function ModoLecturaOverlay({
  abierto,
  fixedRightCss,
  mobileOnly = false,
  showContraerOption = true,
  menuTopCss,
  navItems = [],
  extraItems = [],
  hasCompases = false,
  compasesOcultos = false,
  acordesOcultos = false,
  showAcordesOption = false,
  showOcultarElementosOption = false,
  showTonoOption = false,
  showZoomOption = false,
  showAfinador = true,
  onCerrar,
  onContraer,
  onActivarCompases,
  onToggleAcordesOcultos,
  onAbrirOcultarElementos,
  onAbrirTono,
  onAbrirZoom,
  tonalidadIndex = null,
  onTonalidadChange,
  zoomLevel = 0,
  zoomEnabled = true,
  onZoomDecrease,
  onZoomIncrease,
  onAfinador,
  temaLectura,
  onTemaLecturaChange,
}: ModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  const showActivarCompases = Boolean(hasCompases && compasesOcultos);

  const items: ResolvedItem[] = showContraerOption
    ? [{
      key: "contraer",
      icon: Minimize2,
      label: "Contraer",
      onClick: onContraer,
      closeOnClick: false,
    }]
    : [];
  items.push(...navItems.map((item) => ({ ...item, closeOnClick: true })));

  if (showActivarCompases && onActivarCompases) {
    items.push({
      key: "activar-compases",
      icon: Music2,
      label: "Activar compases",
      onClick: onActivarCompases,
      closeOnClick: true,
    });
  }

  if (showAcordesOption && onToggleAcordesOcultos) {
    items.push({
      key: "acordes",
      icon: acordesOcultos ? Eye : EyeOff,
      label: acordesOcultos ? "Mostrar acordes" : "Ocultar acordes",
      onClick: onToggleAcordesOcultos,
      closeOnClick: true,
    });
  }

  if (showOcultarElementosOption && onAbrirOcultarElementos) {
    items.push({
      key: "ocultar-elementos",
      icon: Eye,
      label: "Elementos",
      onClick: onAbrirOcultarElementos,
      className: "lg:hidden",
      closeOnClick: true,
    });
  }

  if (showTonoOption && onAbrirTono) {
    const tonoSteps =
      tonalidadIndex != null && onTonalidadChange
        ? {
            decrease: {
              content: (
                <span className="text-lg font-semibold leading-none" aria-hidden="true">
                  −
                </span>
              ),
              ariaLabel: "Bajar un semitono",
              onClick: () =>
                onTonalidadChange(normalizeNotaIndex(tonalidadIndex - 1)),
            },
            increase: {
              content: (
                <span className="text-lg font-semibold leading-none" aria-hidden="true">
                  +
                </span>
              ),
              ariaLabel: "Subir un semitono",
              onClick: () =>
                onTonalidadChange(normalizeNotaIndex(tonalidadIndex + 1)),
            },
          }
        : undefined;

    items.push({
      key: "tono",
      icon: Music,
      label: "Cambiar de tono",
      onClick: onAbrirTono,
      className: "lg:hidden",
      closeOnClick: true,
      steps: tonoSteps,
    });
  }

  if (showZoomOption && onAbrirZoom) {
    const zoomSteps =
      onZoomDecrease && onZoomIncrease
        ? {
            decrease: letraZoomStep(
              "chica",
              "Achicar letra",
              onZoomDecrease,
              !zoomEnabled || zoomLevel <= LETRA_ZOOM_MIN_LEVEL,
            ),
            increase: letraZoomStep(
              "grande",
              "Agrandar letra",
              onZoomIncrease,
              !zoomEnabled || zoomLevel >= LETRA_ZOOM_MAX_LEVEL,
            ),
          }
        : undefined;

    items.push({
      key: "zoom",
      icon: Type,
      label: "Tamaño letra",
      onClick: onAbrirZoom,
      className: "lg:hidden",
      closeOnClick: true,
      steps: zoomSteps,
    });
  }

  if (showAfinador && onAfinador) {
    items.push({
      key: "afinador",
      icon: AudioLines,
      label: "Afinador",
      onClick: onAfinador,
      closeOnClick: true,
    });
  }

  if (temaLectura && onTemaLecturaChange) {
    const nextThemeMap = {
      dia: "sepia",
      sepia: "escenario",
      escenario: "dia",
    } as const;
    const themeLabelMap = {
      dia: "Tema: Claro",
      sepia: "Tema: Sepia",
      escenario: "Tema: Escenario",
    } as const;

    items.push({
      key: "tema-lectura",
      icon: Palette,
      label: themeLabelMap[temaLectura],
      onClick: () => onTemaLecturaChange(nextThemeMap[temaLectura]),
      closeOnClick: false,
    });
  }

  for (const item of extraItems) {
    items.push({ ...item, closeOnClick: true });
  }

  return (
    <>
      <button
        type="button"
        data-no-tap-feedback
        className={`fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none${
          mobileOnly ? " lg:hidden" : ""
        }`}
        aria-label="Cerrar menú de controles"
        onClick={onCerrar}
      />

      <div
        className={`pointer-events-none fixed z-40 flex flex-col items-end gap-2${
          mobileOnly ? " lg:hidden" : ""
        }`}
        style={{
          top: menuTopCss ?? getLecturaFabMenuTopCss(),
          right: fixedRightCss,
        }}
        role="menu"
        aria-label="Controles de modo lectura"
      >
        {items.map(({ key, closeOnClick, onClick, ...rest }, index) => (
          <LecturaFabOption
            key={key}
            {...rest}
            cascadeIndex={index}
            onClick={() => {
              if (closeOnClick) {
                onCerrar();
              }
              onClick();
            }}
          />
        ))}
      </div>
    </>
  );
}
