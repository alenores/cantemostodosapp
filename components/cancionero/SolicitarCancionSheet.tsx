"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getArtistas, getArtistasAlias } from "@/lib/artistas";
import { buscarArtistaCandidatos, normalizarNombreArtista } from "@/lib/artistas-match";
import { hayConexion } from "@/lib/conexion";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { leerArtistasFotos } from "@/lib/offline/artista-fotos";
import {
  buscarDuplicadoRemoto,
  leerSolicitudesGuardadas,
  solicitarCancion,
  type DuplicadoSolicitud,
} from "@/lib/solicitudes";
import { createClient } from "@/lib/supabase/client";
import type { Artista, ArtistaAlias, CancionCancionero } from "@/types";
import { Loader2, MicVocal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  userId: string;
  onClose: () => void;
  /** Se envió (o quedó guardada sin señal): mensaje para el aviso breve. */
  onResultado: (mensaje: string) => void;
  onVerCancion: (cancionId: number) => void;
};

/** Mismo criterio que la base: minúsculas, sin tildes, sin espacios ni signos. */
function clave(texto: string | null | undefined): string {
  return normalizarNombreArtista(texto ?? "").replace(/\s+/g, "");
}

const campoClase =
  "min-h-12 w-full rounded-xl border border-border tono-campo px-3 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-2 focus:border-accent";

export default function SolicitarCancionSheet({ userId, onClose, onResultado, onVerCancion }: Props) {
  useBodyScrollLock(true);
  const supabase = useMemo(() => createClient(), []);
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [artistaElegido, setArtistaElegido] = useState<Artista | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [alias, setAlias] = useState<ArtistaAlias[]>([]);
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  /** Respuesta de la base para una combinación canción + artista; vale solo mientras no cambie. */
  const [remoto, setRemoto] = useState<{ clave: string; dup: DuplicadoSolicitud } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lo guardado primero; con señal, artistas y alias al día.
  useEffect(() => {
    let activo = true;
    void leerArtistasFotos()
      .then((locales) => {
        if (activo && locales.length > 0) {
          setArtistas(locales.map(({ id, nombre: n, avatar_url }) => ({ id, nombre: n, avatar_url })));
        }
      })
      .catch(() => {});
    void getCancioneroLocalAsCancionero()
      .then((lista) => {
        if (activo) setCanciones(lista);
      })
      .catch(() => {});
    if (hayConexion()) {
      void getArtistas(supabase).then((lista) => {
        if (activo && lista.length > 0) setArtistas(lista);
      });
      void getArtistasAlias(supabase).then((lista) => {
        if (activo) setAlias(lista);
      });
    }
    return () => {
      activo = false;
    };
  }, [supabase]);

  const sugerencias = useMemo(
    () => (artista.trim().length >= 2 ? buscarArtistaCandidatos(artista, artistas, alias) : []),
    [alias, artista, artistas],
  );

  const nombreArtistaFinal = (artistaElegido?.nombre ?? artista).trim();
  const artistaIdFinal = artistaElegido?.id ?? null;

  // Repetido con lo guardado en el celular (Cancionero y solicitudes).
  const duplicadoLocal = useMemo<DuplicadoSolicitud | null>(() => {
    const kNombre = clave(nombre);
    const kArtista = clave(nombreArtistaFinal);
    if (!kNombre || !kArtista) return null;
    const mismoArtista = (texto: string | null, id: string | null | undefined) =>
      clave(texto) === kArtista || (artistaIdFinal != null && id === artistaIdFinal);

    const cancion = canciones.find((c) => clave(c.nombre) === kNombre && mismoArtista(c.artista, c.artista_id));
    if (cancion) {
      return { tipo: "cancionero", id: cancion.id, nombre: cancion.nombre, artista: cancion.artista };
    }
    const solicitud = leerSolicitudesGuardadas().find(
      (s) => clave(s.nombre) === kNombre && clave(s.artista) === kArtista,
    );
    if (solicitud) {
      return {
        tipo: "solicitud",
        id: solicitud.id,
        nombre: solicitud.nombre,
        artista: solicitud.artista,
        estado: solicitud.estado,
      };
    }
    return null;
  }, [artistaIdFinal, canciones, nombre, nombreArtistaFinal]);

  // Con señal, la base confirma (también encuentra lo que el celular todavía no bajó).
  const claveActual = `${clave(nombre)}|${clave(nombreArtistaFinal)}|${artistaIdFinal ?? ""}`;
  useEffect(() => {
    if (!nombre.trim() || !nombreArtistaFinal) return;
    const t = window.setTimeout(() => {
      void buscarDuplicadoRemoto(supabase, nombre, nombreArtistaFinal, artistaIdFinal).then((dup) => {
        if (dup) setRemoto({ clave: claveActual, dup });
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [artistaIdFinal, claveActual, nombre, nombreArtistaFinal, supabase]);

  const duplicadoRemoto = remoto?.clave === claveActual ? remoto.dup : null;
  const duplicado = duplicadoLocal ?? duplicadoRemoto;
  const puedeEnviar = Boolean(nombre.trim() && nombreArtistaFinal && !duplicado && !enviando);

  async function enviar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    const resultado = await solicitarCancion(supabase, userId, nombre, nombreArtistaFinal, artistaIdFinal);
    setEnviando(false);
    if (resultado.tipo === "enviada") {
      onResultado("Listo. Un agente de IA la va a sumar al Cancionero.");
    } else if (resultado.tipo === "guardada-sin-senal") {
      onResultado("Quedó guardada. Se envía cuando haya señal.");
    } else if (resultado.tipo === "duplicado") {
      setRemoto({ clave: claveActual, dup: resultado.duplicado });
    } else {
      setError("No se pudo enviar. Probá de nuevo.");
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-3xl bg-bg-sala px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-2.5 lg:rounded-3xl lg:pb-6">
        <span className="mx-auto h-1.5 w-10 rounded-full bg-cola-sheet-pill lg:hidden" aria-hidden="true" />
        <h2 className="text-lg font-extrabold text-text-primary">Solicitar canción</h2>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-secondary">Canción *</span>
          <input
            className={campoClase}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la canción"
            autoFocus
            enterKeyHint="next"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-secondary" htmlFor="solicitud-artista">
            Artista *
          </label>
          <input
            id="solicitud-artista"
            className={campoClase}
            value={artista}
            onChange={(e) => {
              setArtista(e.target.value);
              setArtistaElegido(null);
              setMostrarSugerencias(true);
            }}
            onFocus={() => setMostrarSugerencias(true)}
            placeholder="Nombre del artista"
            autoComplete="off"
            enterKeyHint="done"
          />
          {mostrarSugerencias && !artistaElegido && artista.trim().length >= 2 ? (
            <ul className="overflow-hidden rounded-xl border border-border bg-bg-card">
              {sugerencias.map(({ artista: a, coincideCon }) => (
                <li key={a.id} className="border-b border-border-subtle last:border-b-0">
                  <TapButton
                    type="button"
                    onClick={() => {
                      setArtistaElegido(a);
                      setArtista(a.nombre);
                      setMostrarSugerencias(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[15px] text-text-primary"
                  >
                    <MicVocal className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
                    {coincideCon !== a.nombre ? (
                      <span className="truncate text-xs text-text-muted">({coincideCon})</span>
                    ) : null}
                  </TapButton>
                </li>
              ))}
              <li>
                <TapButton
                  type="button"
                  onClick={() => setMostrarSugerencias(false)}
                  className="w-full px-3 py-2.5 text-left text-sm text-text-muted"
                >
                  Usar «{artista.trim()}» como artista nuevo
                </TapButton>
              </li>
            </ul>
          ) : null}
        </div>

        {duplicado ? (
          <div className="rounded-xl bg-solicitud-no/12 px-3 py-2.5 text-sm text-text-primary">
            <p className="font-bold text-solicitud-no">
              {duplicado.tipo === "cancionero"
                ? "Esta canción ya está en el Cancionero"
                : "Esta canción ya fue solicitada"}
            </p>
            <p className="mt-0.5">
              «{duplicado.nombre}
              {duplicado.artista ? ` – ${duplicado.artista}` : ""}».{" "}
              {duplicado.tipo === "cancionero" ? (
                <TapButton
                  type="button"
                  onClick={() => onVerCancion(duplicado.id)}
                  className="inline font-bold text-accent"
                >
                  Verla ›
                </TapButton>
              ) : null}
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm font-semibold text-solicitud-no">{error}</p> : null}

        <TapButton
          type="button"
          onClick={() => void enviar()}
          disabled={!puedeEnviar}
          className="mt-1 flex min-h-12 items-center justify-center rounded-2xl bg-accent text-[15px] font-extrabold text-white disabled:bg-bg-darker disabled:text-text-muted"
        >
          {enviando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : "Solicitar"}
        </TapButton>
      </div>
    </div>,
    document.body,
  );
}
