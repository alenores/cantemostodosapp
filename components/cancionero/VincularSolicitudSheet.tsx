"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { normalizarNombreArtista } from "@/lib/artistas-match";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { resolverSolicitud, type Solicitud } from "@/lib/solicitudes";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  solicitud: Solicitud;
  onClose: () => void;
  onListo: (error: string | null) => void;
};

const MAX_RESULTADOS = 30;

/**
 * Dueño: la canción ya está en el Cancionero (la cargó a mano). Se elige y la solicitud queda
 * «cargada», con la canción a nombre de quien la pidió.
 */
export default function VincularSolicitudSheet({ solicitud, onClose, onListo }: Props) {
  useBodyScrollLock(true);
  const supabase = useMemo(() => createClient(), []);
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [busqueda, setBusqueda] = useState(solicitud.nombre);
  const [guardando, setGuardando] = useState<number | null>(null);

  useEffect(() => {
    void getCancioneroLocalAsCancionero()
      .then(setCanciones)
      .catch(() => {});
  }, []);

  const resultados = useMemo(() => {
    const q = normalizarNombreArtista(busqueda);
    if (!q) return [];
    return canciones
      .filter((c) => normalizarNombreArtista(`${c.nombre} ${c.artista ?? ""}`).includes(q))
      .slice(0, MAX_RESULTADOS);
  }, [busqueda, canciones]);

  async function vincular(cancionId: number) {
    setGuardando(cancionId);
    const error = await resolverSolicitud(supabase, solicitud.id, cancionId);
    setGuardando(null);
    onListo(error);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col gap-3 rounded-t-3xl bg-bg-sala px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-2.5 lg:rounded-3xl lg:pb-6">
        <span className="mx-auto h-1.5 w-10 rounded-full bg-cola-sheet-pill lg:hidden" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-extrabold text-text-primary">¿Cuál es la canción?</h2>
          <p className="text-sm text-text-muted">
            Pedida: «{solicitud.nombre} – {solicitud.artista}». Queda a nombre de quien la pidió.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            className="min-h-11 w-full rounded-xl border border-border tono-campo pl-9 pr-3 text-base text-text-primary outline-none focus:border-accent"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el Cancionero"
          />
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {resultados.length === 0 ? (
            <li className="py-6 text-center text-sm text-text-muted">No hay coincidencias.</li>
          ) : (
            resultados.map((c) => (
              <li key={c.id}>
                <TapButton
                  type="button"
                  disabled={guardando !== null}
                  onClick={() => void vincular(c.id)}
                  className="flex w-full items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-text-primary">{c.nombre}</span>
                    <span className="block truncate text-[13px] text-text-muted">{c.artista ?? "Sin artista"}</span>
                  </span>
                  {guardando === c.id ? <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" /> : null}
                </TapButton>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
