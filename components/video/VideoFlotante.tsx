"use client";

import { youtubeEmbedUrl } from "@/lib/youtube";
import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

const MARGEN_PX = 8;
const ANCHO_CHICO = "min(58vw, 260px)";
const ANCHO_GRANDE = "min(92vw, 480px)";

type Posicion = { x: number; y: number };

type VideoFlotanteProps = {
  videoId: string;
  titulo?: string;
  onCerrar: () => void;
};

/**
 * Ventanita flotante con el reproductor de YouTube sobre la letra.
 * Se mueve arrastrando la barra superior y se agranda o achica. La pantalla
 * completa la da el botón propio de YouTube.
 */
export default function VideoFlotante({ videoId, titulo, onCerrar }: VideoFlotanteProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const [grande, setGrande] = useState(false);
  const [posicion, setPosicion] = useState<Posicion | null>(null);

  const acomodarDentroDePantalla = useCallback((next: Posicion): Posicion => {
    const panel = panelRef.current;
    const ancho = panel?.offsetWidth ?? 0;
    const alto = panel?.offsetHeight ?? 0;
    return {
      x: Math.min(Math.max(MARGEN_PX, next.x), window.innerWidth - ancho - MARGEN_PX),
      y: Math.min(Math.max(MARGEN_PX, next.y), window.innerHeight - alto - MARGEN_PX),
    };
  }, []);

  // Posición inicial: abajo a la izquierda, sin tapar los controles de la derecha.
  useEffect(() => {
    if (posicion) return;
    const panel = panelRef.current;
    if (!panel) return;
    setPosicion(
      acomodarDentroDePantalla({
        x: MARGEN_PX * 2,
        y: window.innerHeight - panel.offsetHeight - 120,
      }),
    );
  }, [acomodarDentroDePantalla, posicion]);

  // Al agrandar/achicar o girar el celular, que no quede afuera de la pantalla.
  useEffect(() => {
    const reacomodar = () =>
      setPosicion((actual) => (actual ? acomodarDentroDePantalla(actual) : actual));
    const frame = requestAnimationFrame(reacomodar);
    window.addEventListener("resize", reacomodar);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", reacomodar);
    };
  }, [grande, acomodarDentroDePantalla]);

  function empezarArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as Element).closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    arrastreRef.current = {
      pointerId: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moverArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.pointerId !== event.pointerId) return;
    setPosicion(
      acomodarDentroDePantalla({
        x: event.clientX - arrastre.dx,
        y: event.clientY - arrastre.dy,
      }),
    );
  }

  function terminarArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    if (arrastreRef.current?.pointerId !== event.pointerId) return;
    arrastreRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  // Solo se abre por un toque de la persona, nunca al renderizar en el servidor.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={titulo ? `Video: ${titulo}` : "Video de la canción"}
      className="fixed z-[400] overflow-hidden rounded-xl border border-border bg-bg-dark shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
      style={{
        width: grande ? ANCHO_GRANDE : ANCHO_CHICO,
        left: posicion?.x ?? MARGEN_PX * 2,
        top: posicion?.y ?? "auto",
        bottom: posicion ? "auto" : 120,
        visibility: posicion ? "visible" : "hidden",
      }}
    >
      <div
        className="flex touch-none select-none items-center gap-1 px-1.5 py-1 cursor-grab active:cursor-grabbing"
        onPointerDown={empezarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
      >
        <GripHorizontal className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
          {titulo ?? "Video"}
        </span>
        <button
          type="button"
          aria-label={grande ? "Achicar video" : "Agrandar video"}
          onClick={() => setGrande((actual) => !actual)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-primary"
        >
          {grande ? (
            <Minimize2 className="size-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label="Cerrar video"
          onClick={onCerrar}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="relative aspect-video w-full bg-black">
        <iframe
          key={videoId}
          src={youtubeEmbedUrl(videoId)}
          title={titulo ? `Video de ${titulo}` : "Video de YouTube"}
          className="absolute inset-0 size-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>,
    document.body,
  );
}
