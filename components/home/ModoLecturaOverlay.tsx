"use client";

import {
  LecturaFabOption,
  type LecturaFabItem,
} from "@/components/home/LecturaFabOption";
import { getLecturaFabMenuTopCss } from "@/lib/sala-layout";
import {
  AudioLines,
  Eye,
  EyeOff,
  Minimize2,
  Music,
  Music2,
  Type,
} from "lucide-react";

type ResolvedItem = LecturaFabItem & { closeOnClick: boolean };

type ModoLecturaOverlayProps = {
  abierto: boolean;
  fixedRightCss: string;
  /** Oculta backdrop y menú en desktop (p. ej. cancionero). */
  mobileOnly?: boolean;
  /** Bloque del medio propio de cada pantalla (buscar/fila o anterior/siguiente). */
  navItems?: LecturaFabItem[];
  /** Ítems extra al final (p. ej. canto: anotaciones, nota, editar). */
  extraItems?: LecturaFabItem[];
  hasCompases?: boolean;
  compasesOcultos?: boolean;
  acordesOcultos?: boolean;
  showAcordesOption?: boolean;
  showTonoOption?: boolean;
  showZoomOption?: boolean;
  showAfinador?: boolean;
  onCerrar: () => void;
  onContraer: () => void;
  onActivarCompases?: () => void;
  onToggleAcordesOcultos?: () => void;
  onAbrirTono?: () => void;
  onAbrirZoom?: () => void;
  onAfinador?: () => void;
};

/** Menú flotante de controles de modo lectura (celular). Compartido por las pantallas. */
export default function ModoLecturaOverlay({
  abierto,
  fixedRightCss,
  mobileOnly = false,
  navItems = [],
  extraItems = [],
  hasCompases = false,
  compasesOcultos = false,
  acordesOcultos = false,
  showAcordesOption = false,
  showTonoOption = false,
  showZoomOption = false,
  showAfinador = true,
  onCerrar,
  onContraer,
  onActivarCompases,
  onToggleAcordesOcultos,
  onAbrirTono,
  onAbrirZoom,
  onAfinador,
}: ModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  const showActivarCompases = Boolean(hasCompases && compasesOcultos);

  const items: ResolvedItem[] = [
    {
      key: "contraer",
      icon: Minimize2,
      label: "Contraer",
      onClick: onContraer,
      closeOnClick: false,
    },
    ...navItems.map((item) => ({ ...item, closeOnClick: true })),
  ];

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

  if (showTonoOption && onAbrirTono) {
    items.push({
      key: "tono",
      icon: Music,
      label: "Cambiar de tono",
      onClick: onAbrirTono,
      className: "lg:hidden",
      closeOnClick: true,
    });
  }

  if (showZoomOption && onAbrirZoom) {
    items.push({
      key: "zoom",
      icon: Type,
      label: "Tamaño letra",
      onClick: onAbrirZoom,
      className: "lg:hidden",
      closeOnClick: true,
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
          top: getLecturaFabMenuTopCss(),
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
