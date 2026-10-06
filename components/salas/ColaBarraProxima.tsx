"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Search, SkipForward } from "lucide-react";
import type { KeyboardEvent, TouchEvent } from "react";

export type ColaProximaDisplay = {
  nombre: string;
  artista: string | null;
};

/** Alto de la zona de la pastilla (margen + pastilla + margen), igual en barrita y panel. */
export const COLA_PASTILLA_ZONA_PX = 14;

/** Contorno de la barrita cerrada; el panel abierto parte de este mismo rectángulo. */
export const COLA_BARRA_RADIO_PX = 12;

const BARRA_BTN =
  "flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-dark/80 text-text-primary";

export function ColaPastilla() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-cola-sheet-pill"
      style={{ top: (COLA_PASTILLA_ZONA_PX - 4) / 2 }}
      aria-hidden="true"
    />
  );
}

type ColaBarraProximaContenidoProps = {
  proxima: ColaProximaDisplay | null;
  pendientesCount: number;
  aviso?: string | null;
  showSiguiente?: boolean;
  siguienteDisabled?: boolean;
  onBuscar?: () => void;
  onSiguiente?: () => void;
  /** Copia visual dentro del panel mientras se transforma: sin botones activos. */
  decorativa?: boolean;
};

/** Próxima canción + lupa + siguiente (sin la pastilla ni el contorno). */
export function ColaBarraProximaContenido({
  proxima,
  pendientesCount,
  aviso = null,
  showSiguiente = true,
  siguienteDisabled = false,
  onBuscar,
  onSiguiente,
  decorativa = false,
}: ColaBarraProximaContenidoProps) {
  const etiqueta =
    aviso ?? (pendientesCount > 0 ? `Próxima · ${pendientesCount} en fila` : "Fila");

  return (
    <div className="flex items-center gap-2 px-3 pb-2">
      <div className="min-w-0 flex-1 leading-tight">
        <p
          role={aviso && !decorativa ? "status" : undefined}
          aria-live={aviso && !decorativa ? "polite" : undefined}
          className="truncate text-[10px] font-semibold uppercase tracking-wide text-accent"
        >
          {etiqueta}
        </p>
        {proxima ? (
          <p className="mt-0.5 truncate">
            <span className="text-[15px] font-semibold text-text-primary">
              {proxima.nombre}
            </span>
            {proxima.artista ? (
              <span className="text-xs text-text-muted"> · {proxima.artista}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-xs text-text-muted">
            Sin canciones en fila
          </p>
        )}
      </div>

      <TapButton
        type="button"
        aria-label="Buscar canción"
        tabIndex={decorativa ? -1 : undefined}
        aria-hidden={decorativa || undefined}
        onClick={(event) => {
          event.stopPropagation();
          onBuscar?.();
        }}
        className={BARRA_BTN}
      >
        <Search className="size-4 text-accent" aria-hidden="true" />
      </TapButton>

      {showSiguiente ? (
        <TapButton
          type="button"
          aria-label="Siguiente canción"
          tabIndex={decorativa ? -1 : undefined}
          aria-hidden={decorativa || undefined}
          disabled={siguienteDisabled}
          onClick={(event) => {
            event.stopPropagation();
            onSiguiente?.();
          }}
          className={`${BARRA_BTN} ${siguienteDisabled ? "pointer-events-none opacity-40" : ""}`}
        >
          <SkipForward className="size-4" aria-hidden="true" />
        </TapButton>
      ) : null}
    </div>
  );
}

type ColaBarraProximaProps = ColaBarraProximaContenidoProps & {
  onAbrir: () => void;
  /** Toque sobre la barrita (fuera de los botones): el panel puede seguir al dedo hacia arriba. */
  onArrastrar: (clientY: number, clientX: number) => void;
};

/**
 * Fila cerrada (celular, vista control): barrita con pastilla. Tocarla o
 * deslizarla hacia arriba abre la fila como panel desde este mismo lugar.
 */
export default function ColaBarraProxima({
  onAbrir,
  onArrastrar,
  ...contenido
}: ColaBarraProximaProps) {
  function esBoton(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("button"));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || esBoton(event.target)) {
      return;
    }

    const touch = event.touches[0];
    onArrastrar(touch.clientY, touch.clientX);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAbrir();
    }
  }

  return (
    <div
      data-cola-barra=""
      role="button"
      tabIndex={0}
      aria-label="Abrir fila"
      onTouchStart={handleTouchStart}
      onClick={(event) => {
        if (!esBoton(event.target)) onAbrir();
      }}
      onKeyDown={handleKeyDown}
      className="relative shrink-0 cursor-pointer select-none border border-border bg-bg-cola-sheet"
      style={{
        borderRadius: COLA_BARRA_RADIO_PX,
        paddingTop: COLA_PASTILLA_ZONA_PX,
        touchAction: "none",
      }}
    >
      <ColaPastilla />
      <ColaBarraProximaContenido {...contenido} />
    </div>
  );
}
