"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchCancionesCancionero } from "@/lib/cancionero";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";

/** Título comparable: sin mayúsculas, tildes ni signos. */
function tituloPlano(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

let cancionesCache: Promise<CancionCancionero[]> | null = null;

function cargarCanciones(): Promise<CancionCancionero[]> {
  if (!cancionesCache) {
    cancionesCache = fetchCancionesCancionero(createClient())
      .catch(() => getCancioneroLocalAsCancionero())
      .catch(() => []);
    // Se vuelve a pedir la próxima vez que se abra el editor.
    void cancionesCache.finally(() => {
      setTimeout(() => {
        cancionesCache = null;
      }, 60_000);
    });
  }
  return cancionesCache;
}

type Props = {
  nombre: string;
  artista?: string;
  /** Canción que se está editando: no cuenta como repetida. */
  excluirId?: number | null;
};

/**
 * Avisa que ya hay en el cancionero una canción con el mismo nombre.
 * Puede ser de otro artista, así que no bloquea: solo informa y deja comparar.
 */
export default function CancionRepetidaAviso({ nombre, artista = "", excluirId }: Props) {
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    void cargarCanciones().then((lista) => {
      if (vigente) setCanciones(lista);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const repetidas = useMemo(() => {
    const titulo = tituloPlano(nombre);
    if (!titulo) return [];
    return canciones.filter(
      (cancion) => cancion.id !== excluirId && tituloPlano(cancion.nombre) === titulo,
    );
  }, [canciones, nombre, excluirId]);

  if (repetidas.length === 0) return null;

  const artistaPlano = tituloPlano(artista);
  const mismoArtista = Boolean(artistaPlano) &&
    repetidas.some((cancion) => tituloPlano(cancion.artista ?? "") === artistaPlano);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-1.5 flex w-full items-start gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-2.5 py-1.5 text-left text-xs text-text-primary"
      >
        <AlertTriangle className="mt-px size-3.5 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {mismoArtista
            ? "Esta canción ya está en el cancionero con el mismo artista."
            : repetidas.length === 1
              ? "Ya hay una canción con este nombre en el cancionero."
              : `Ya hay ${repetidas.length} canciones con este nombre en el cancionero.`}{" "}
          <span className="font-semibold text-accent underline">Ver</span>
        </span>
      </button>

      {abierto
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setAbierto(false)}
            >
              <div
                role="dialog"
                aria-label="Canción repetida"
                onClick={(event) => event.stopPropagation()}
                className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-dark shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-center gap-2 border-b border-border bg-bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-text-primary">Ya está en el cancionero</h2>
                    <p className="text-xs text-text-muted">
                      Compará la letra. Si es de otro artista, podés guardarla igual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    aria-label="Cerrar"
                    className="rounded-full border border-border p-1.5 text-text-secondary hover:border-accent hover:text-text-primary"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {repetidas.map((cancion) => (
                    <section
                      key={cancion.id}
                      className="rounded-xl border border-border-card bg-bg-card p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Artista
                      </p>
                      <p className="font-medium text-text-primary">
                        {cancion.artista || "Sin artista"}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Canción
                      </p>
                      <p className="font-medium text-text-primary">{cancion.nombre}</p>
                      <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-letra-bg p-3 font-mono text-xs leading-relaxed text-letra-text">
                        {cancion.letra?.trim() || "Sin letra"}
                      </pre>
                    </section>
                  ))}
                </div>

                <div className="border-t border-border bg-bg-card p-3">
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-bg-darker hover:opacity-90"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
