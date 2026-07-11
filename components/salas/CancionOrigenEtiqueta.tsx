"use client";

import ColaFilaFloatButton from "@/components/salas/ColaFilaFloatButton";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import LetraFuenteSitioBadge, {
  SitioLetraBadge,
} from "@/components/salas/LetraFuenteSitioBadge";
import { TapButton } from "@/components/ui/TapFeedback";
import { resolveCancionOrigen } from "@/lib/buscador";
import { CONTROL_LETRA_ORIGEN_GAP_PX } from "@/lib/sala-layout";
import { SkipForward } from "lucide-react";

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
};

type CancionOrigenEtiquetaProps = {
  urlLetra?: string | null;
  letraTexto?: string | null;
  premium?: boolean;
  filaActions?: ControlLetraFilaActions | null;
};

export default function CancionOrigenEtiqueta({
  urlLetra = null,
  letraTexto = null,
  premium = false,
  filaActions = null,
}: CancionOrigenEtiquetaProps) {
  const origen = resolveCancionOrigen({
    url_letra: urlLetra,
    letra_texto: letraTexto,
  });

  const showFila = Boolean(filaActions?.showFila ?? filaActions);
  const showSiguiente = Boolean(filaActions?.showSiguiente);
  const hasActions = showFila || showSiguiente;

  if (!origen && !hasActions) {
    return null;
  }

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      style={{ paddingTop: CONTROL_LETRA_ORIGEN_GAP_PX }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {origen ? (
          <>
            <LetraFuenteIcon
              tipo={origen.iconoTipo}
              compact
              premium={premium}
            />
            {origen.sitio === "cancionero" ? (
              <LetraFuenteSitioBadge variant="cancionero" />
            ) : (
              <SitioLetraBadge sitio={origen.sitio} url={origen.url} />
            )}
          </>
        ) : null}
      </div>

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
              className={`flex size-10 items-center justify-center lg:hidden ${CONTROL_ACCION_BTN} ${
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
