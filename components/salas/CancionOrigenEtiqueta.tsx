"use client";

import ColaBarraProxima, {
  type ColaProximaDisplay,
} from "@/components/salas/ColaBarraProxima";
import CifraClubEmbedHelpModal from "@/components/salas/CifraClubEmbedHelpModal";
import ColaFilaFloatButton from "@/components/salas/ColaFilaFloatButton";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import LetraFuenteSitioBadge, {
  getLetraFuenteSitioBadgeVariant,
  SitioLetraBadge,
} from "@/components/salas/LetraFuenteSitioBadge";
import { TapButton } from "@/components/ui/TapFeedback";
import { resolveCancionOrigen } from "@/lib/buscador";
import { CONTROL_LETRA_ORIGEN_GAP_PX } from "@/lib/sala-layout";
import { HelpCircle, SkipForward } from "lucide-react";
import { useState } from "react";

const CONTROL_ACCION_BTN =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";

export type ControlLetraFilaActions = {
  pendientesCount: number;
  colaAviso: string | null;
  colaAvisoExiting: boolean;
  onOpenFila: () => void;
  onSiguiente: () => void;
  siguienteDisabled?: boolean;
  showFila?: boolean;
  showSiguiente?: boolean;
  /** Celular: la fila cerrada es una barrita (próxima, lupa y siguiente) que se arrastra hacia arriba. */
  barra?: boolean;
  proxima?: ColaProximaDisplay | null;
  onBuscar?: () => void;
  onArrastrarFila?: (clientY: number, clientX: number) => void;
};

/** Origen de la letra (Cancionero / Acordes de Canciones / Cifra Club): tercera línea del título. */
export function CancionOrigenBadge({
  urlLetra = null,
  letraTexto = null,
  premium = false,
}: {
  urlLetra?: string | null;
  letraTexto?: string | null;
  premium?: boolean;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const origen = resolveCancionOrigen({
    url_letra: urlLetra,
    letra_texto: letraTexto,
  });

  if (!origen) {
    return null;
  }

  const esCifraClub =
    getLetraFuenteSitioBadgeVariant(origen.sitio, origen.url) === "cifraclub";

  return (
    <div className="mt-1 flex min-w-0 items-center gap-1">
      <LetraFuenteIcon tipo={origen.iconoTipo} tiny premium={premium} />
      {origen.sitio === "cancionero" ? (
        <LetraFuenteSitioBadge variant="cancionero" small />
      ) : esCifraClub ? (
        <>
          {/* Cifra Club: la etiqueta es el botón de ayuda («¿por qué se ve como página web?»). */}
          <TapButton
            type="button"
            aria-label="¿Por qué se ve como página web?"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-0.5 p-0"
          >
            <LetraFuenteSitioBadge variant="cifraclub" small />
            <HelpCircle
              className="size-3 shrink-0 text-text-primary"
              strokeWidth={2.75}
              aria-hidden="true"
            />
          </TapButton>
          <CifraClubEmbedHelpModal
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
          />
        </>
      ) : (
        <SitioLetraBadge sitio={origen.sitio} url={origen.url} small />
      )}
    </div>
  );
}

type CancionOrigenEtiquetaProps = {
  filaActions?: ControlLetraFilaActions | null;
};

/** Bajo la letra (vista control): barrita de la fila en celular; en PC, Fila y Siguiente. */
export default function CancionOrigenEtiqueta({
  filaActions = null,
}: CancionOrigenEtiquetaProps) {
  if (filaActions?.barra) {
    return (
      <div className="shrink-0" style={{ paddingTop: CONTROL_LETRA_ORIGEN_GAP_PX }}>
        <ColaBarraProxima
          proxima={filaActions.proxima ?? null}
          pendientesCount={filaActions.pendientesCount}
          aviso={filaActions.colaAviso}
          showSiguiente={Boolean(filaActions.showSiguiente)}
          siguienteDisabled={filaActions.siguienteDisabled}
          onBuscar={filaActions.onBuscar}
          onSiguiente={filaActions.onSiguiente}
          onAbrir={filaActions.onOpenFila}
          onArrastrar={(clientY, clientX) =>
            filaActions.onArrastrarFila?.(clientY, clientX)
          }
        />
      </div>
    );
  }

  const showFila = Boolean(filaActions?.showFila ?? filaActions);
  const showSiguiente = Boolean(filaActions?.showSiguiente);
  const hasActions = showFila || showSiguiente;

  if (!hasActions) {
    return null;
  }

  return (
    <div
      className="flex shrink-0 items-center justify-end gap-2"
      style={{ paddingTop: CONTROL_LETRA_ORIGEN_GAP_PX }}
    >

      {filaActions && hasActions ? (
        <div className="flex shrink-0 items-center gap-2">
          {showFila ? (
            <ColaFilaFloatButton
              pendientesCount={filaActions.pendientesCount}
              colaAviso={filaActions.colaAviso}
              colaAvisoExiting={filaActions.colaAvisoExiting}
              onClick={filaActions.onOpenFila}
            />
          ) : null}
          {showSiguiente ? (
            <TapButton
              type="button"
              aria-label="Siguiente canción"
              disabled={filaActions.siguienteDisabled}
              onClick={filaActions.onSiguiente}
              className={`flex size-9 items-center justify-center lg:hidden ${CONTROL_ACCION_BTN} ${
                filaActions.siguienteDisabled
                  ? "pointer-events-none opacity-40"
                  : ""
              }`}
            >
              <SkipForward className="size-4" aria-hidden="true" />
            </TapButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
