"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  anotacionVaAbajo,
  anotacionVaArriba,
  EXIGENCIA_ALTURA_PX,
  EXIGENCIA_COLOR_CSS,
  type Anotacion,
  type AnotacionVisibility,
  type ExigenciaColor,
  type IntensidadNivel,
} from "@/lib/anotaciones-practica";
import { Speech, Volume2, Wind } from "lucide-react";

export type AnotacionCharPosition = {
  left: number;
  center: number;
  bottom: number;
};

/** Alto en px de la banda de arriba (intensidad/respirar). Sube los acordes. */
export const ANOTACIONES_ARRIBA_BANDA_PX = 16;

/** Arranque del palito (intensidad/respirar), justo debajo del ícono. */
const ARRIBA_STEM_TOP_PX = 14;

/** Flecha inclinada según el nivel (30°/60°) y el sentido (fuerte↑ / suave↓). */
function IntensidadFlecha({
  nivel,
  arrowSize,
}: {
  nivel: IntensidadNivel;
  arrowSize: number;
}) {
  const sube = nivel === "up1" || nivel === "up2";
  const dosNiveles = nivel === "up2" || nivel === "down2";
  const angle = (sube ? -1 : 1) * (dosNiveles ? 60 : 30);

  return (
    <svg
      width={arrowSize}
      height={arrowSize}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${angle}deg)` }}
      aria-hidden="true"
    >
      <line x1="2" y1="6" x2="10" y2="6" />
      <polyline points="7,3 10,6 7,9" />
    </svg>
  );
}

/**
 * Ícono de intensidad para Canto: cabeza hablando (voz saliendo) + flecha.
 * La inclinación indica el nivel (30° = un nivel, 60° = dos niveles) y el
 * sentido indica más fuerte (arriba) o más suave (abajo).
 * Se usa igual en el renglón y en el selector para mantener coherencia visual.
 */
export function IntensidadIcon({
  nivel,
  arrowSize = 11,
  className = "",
}: {
  nivel: IntensidadNivel;
  arrowSize?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      style={{ color: "var(--accent-entrenador-canciones)" }}
    >
      <Speech className="size-4" strokeWidth={2} aria-hidden="true" />
      <IntensidadFlecha nivel={nivel} arrowSize={arrowSize} />
    </span>
  );
}

/**
 * Variante con parlante (reservada para la futura intensidad de Guitarra).
 * Misma lógica de flecha inclinada que la versión de Canto.
 */
export function IntensidadIconParlante({
  nivel,
  arrowSize = 11,
  className = "",
}: {
  nivel: IntensidadNivel;
  arrowSize?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      style={{ color: "var(--accent-entrenador-canciones)" }}
    >
      <Volume2 className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
      <IntensidadFlecha nivel={nivel} arrowSize={arrowSize} />
    </span>
  );
}

function NotaGlyph() {
  return (
    <span
      className="flex size-[13px] items-center justify-center rounded-full text-[9px] font-bold leading-none text-[var(--text-on-light)]"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--accent-entrenador-canciones) 60%, white)",
      }}
    >
      !
    </span>
  );
}

type AnotacionesLineLayerProps = {
  banda: "arriba" | "abajo" | "fondo";
  anotaciones: Anotacion[];
  charPositions: AnotacionCharPosition[];
  visibility: AnotacionVisibility;
  /**
   * "editor": tocar un ícono lo selecciona (editar/borrar).
   * "lectura": solo la nota abre popup.
   * "display": íconos no interactivos (p. ej. editor celular, que maneja el tap desde el renglón).
   */
  mode: "editor" | "lectura" | "display";
  onSelect?: (anotacion: Anotacion) => void;
  onOpenNota?: (anotacion: Anotacion) => void;
  /** Solo banda "fondo": punto de inicio del rango de Exigencia aún sin cerrar. */
  rangoPendienteOffset?: number | null;
  /** Solo banda "fondo": punto de fin del rango mientras se elige el color. */
  rangoPendienteEndOffset?: number | null;
};

/** Borde derecho aproximado de un carácter (charPositions no guarda ancho). */
function charRightPx(position: AnotacionCharPosition): number {
  return 2 * position.center - position.left;
}

export default function AnotacionesLineLayer({
  banda,
  anotaciones,
  charPositions,
  visibility,
  mode,
  onSelect,
  onOpenNota,
  rangoPendienteOffset = null,
  rangoPendienteEndOffset = null,
}: AnotacionesLineLayerProps) {
  if (banda === "fondo") {
    const rangos = visibility.exigencia
      ? anotaciones.filter(
          (anotacion) =>
            anotacion.tipo === "exigencia" && anotacion.charEnd != null,
        )
      : [];

    const startPos =
      rangoPendienteOffset != null
        ? charPositions[rangoPendienteOffset]
        : null;
    const endPos =
      rangoPendienteEndOffset != null
        ? charPositions[rangoPendienteEndOffset]
        : null;

    if (rangos.length === 0 && !startPos && !endPos) {
      return null;
    }

    return (
      <>
        {/* Resaltado por DETRÁS de la letra (-z-10) y bien tenue. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full">
          {rangos.map((anotacion) => {
            const start = charPositions[anotacion.charOffset];
            const end = charPositions[anotacion.charEnd as number];

            if (!start || !end) {
              return null;
            }

            const left = start.left;
            const width = Math.max(6, charRightPx(end) - left);
            const bottom = Math.max(start.bottom, end.bottom);
            const colorKey: ExigenciaColor = anotacion.color ?? "amarillo";
            const color = EXIGENCIA_COLOR_CSS[colorKey];
            // Anclado abajo; naranja/rojo suben un poco sin llegar a los acordes.
            const blockHeight = EXIGENCIA_ALTURA_PX[colorKey];
            const blockBottom = bottom + 1;
            const blockTop = blockBottom - blockHeight;

            return (
              <span key={anotacion.id}>
                <span
                  className="absolute rounded-[3px]"
                  style={{
                    left,
                    width,
                    top: blockTop,
                    height: blockHeight,
                    backgroundColor: color,
                    opacity: 0.18,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    left,
                    width,
                    top: blockTop,
                    height: 1,
                    backgroundColor: color,
                    opacity: 0.9,
                  }}
                  aria-hidden="true"
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    left,
                    width,
                    top: blockBottom - 1,
                    height: 1,
                    backgroundColor: color,
                    opacity: 0.9,
                  }}
                  aria-hidden="true"
                />
              </span>
            );
          })}
        </div>

        {startPos || endPos ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-full">
            {startPos ? (
              <span
                className="absolute w-0.5 rounded-full"
                style={{
                  left: startPos.left,
                  top: startPos.bottom - 14,
                  height: 15,
                  backgroundColor: "var(--accent-entrenador-canciones)",
                }}
                aria-hidden="true"
              />
            ) : null}
            {endPos ? (
              <span
                className="absolute w-0.5 rounded-full"
                style={{
                  left: endPos.left,
                  top: endPos.bottom - 14,
                  height: 15,
                  backgroundColor: "var(--accent-entrenador-canciones)",
                }}
                aria-hidden="true"
              />
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  const items = anotaciones.filter((anotacion) => {
    if (!visibility[anotacion.tipo]) {
      return false;
    }

    return banda === "arriba"
      ? anotacionVaArriba(anotacion.tipo)
      : anotacionVaAbajo(anotacion.tipo);
  });

  if (items.length === 0) {
    return null;
  }

  const isArriba = banda === "arriba";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20"
      style={isArriba ? { height: ANOTACIONES_ARRIBA_BANDA_PX } : undefined}
    >
      {items.map((anotacion) => {
        const position = charPositions[anotacion.charOffset];

        if (!position) {
          return null;
        }

        const interactive =
          mode === "editor" ||
          (mode === "lectura" && anotacion.tipo === "nota");

        function handleClick(event: React.MouseEvent) {
          event.stopPropagation();

          if (mode === "lectura") {
            if (anotacion.tipo === "nota") {
              onOpenNota?.(anotacion);
            }
            return;
          }

          onSelect?.(anotacion);
        }

        let content: React.ReactNode = null;
        const isIntensidad =
          anotacion.tipo === "intensidad" && Boolean(anotacion.nivel);
        const isRespirar = anotacion.tipo === "respirar";
        const hasArribaStem = isIntensidad || isRespirar;

        if (isIntensidad && anotacion.nivel) {
          content = <IntensidadIcon nivel={anotacion.nivel} />;
        } else if (isRespirar) {
          content = (
            <Wind
              className="size-3.5"
              strokeWidth={2.25}
              style={{ color: "var(--accent-entrenador-canciones)" }}
              aria-hidden="true"
            />
          );
        } else if (anotacion.tipo === "nota") {
          content = <NotaGlyph />;
        } else if (anotacion.tipo === "texto") {
          content = (
            <span className="whitespace-nowrap text-[10px] italic leading-none text-text-muted">
              {anotacion.texto ?? ""}
            </span>
          );
        }

        // Arriba: pegado al tope de la banda. Abajo: anclado justo bajo la letra
        // (posición absoluta, sin ocupar alto en el flujo → no empuja el compás).
        const commonStyle = {
          left: position.left,
          top: isArriba ? 0 : position.bottom + 1,
        } as const;
        const commonClass =
          "absolute flex items-center " +
          (interactive ? "pointer-events-auto" : "pointer-events-none");

        // Palito como los acordes: baja por la letra, sin circulito, tono más suave.
        // Va fuera del botón para que el feedback al tocar no lo escale.
        const arribaStem = hasArribaStem ? (
          <span
            className="pointer-events-none absolute w-px"
            style={{
              top: ARRIBA_STEM_TOP_PX,
              left: 0,
              height: Math.max(4, position.bottom - ARRIBA_STEM_TOP_PX),
              backgroundColor:
                "color-mix(in srgb, var(--accent-entrenador-canciones) 28%, transparent)",
            }}
            aria-hidden="true"
          />
        ) : null;

        if (hasArribaStem) {
          return (
            <span
              key={anotacion.id}
              className="absolute"
              style={commonStyle}
            >
              {interactive ? (
                <TapButton
                  type="button"
                  onClick={handleClick}
                  className="pointer-events-auto flex items-center"
                  aria-label={`Anotación ${anotacion.tipo}`}
                >
                  {content}
                </TapButton>
              ) : (
                <span className="pointer-events-none flex items-center">
                  {content}
                </span>
              )}
              {arribaStem}
            </span>
          );
        }

        if (interactive) {
          return (
            <TapButton
              key={anotacion.id}
              type="button"
              onClick={handleClick}
              className={commonClass}
              style={commonStyle}
              aria-label={`Anotación ${anotacion.tipo}`}
            >
              {content}
            </TapButton>
          );
        }

        return (
          <span key={anotacion.id} className={commonClass} style={commonStyle}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
