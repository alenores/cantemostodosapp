"use client";

import { useEsDueno } from "@/hooks/useEsDueno";
import { addArtistaAlias, getArtistas } from "@/lib/artistas";
import { recargarAliasBusqueda } from "@/lib/artistas-alias-busqueda";
import { normalizarNombreArtista } from "@/lib/artistas-match";
import { createClient } from "@/lib/supabase/client";
import type { Artista } from "@/types";
import { useMemo, useState } from "react";

type VincularNombreArtistaProps = {
  /** Lo que se escribió en el buscador. */
  texto: string;
};

/**
 * Solo dueño: botón sutil debajo de un buscador para anotar que lo escrito
 * («Carlitos») es otro nombre de un artista de la lista («La Mona Jiménez»).
 */
export default function VincularNombreArtista({ texto }: VincularNombreArtistaProps) {
  const esDueno = useEsDueno();
  const [abierto, setAbierto] = useState(false);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [filtro, setFiltro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const nombre = texto.trim();

  const filtrados = useMemo(() => {
    const filtroNorm = normalizarNombreArtista(filtro);
    if (!filtroNorm) return artistas;
    return artistas.filter((artista) =>
      normalizarNombreArtista(artista.nombre).includes(filtroNorm),
    );
  }, [artistas, filtro]);

  if (!esDueno || normalizarNombreArtista(nombre).length < 2) return null;

  function abrir() {
    setAbierto(true);
    setFiltro("");
    setMensaje(null);
    if (artistas.length === 0) void getArtistas(supabase).then(setArtistas);
  }

  async function elegir(artista: Artista) {
    setGuardando(true);
    const guardado = await addArtistaAlias(supabase, artista.id, nombre);
    setGuardando(false);

    if (!guardado) {
      setMensaje(`«${nombre}» ya estaba anotado (o no se pudo guardar).`);
      return;
    }

    await recargarAliasBusqueda(supabase);
    setMensaje(`Listo: «${nombre}» ahora encuentra a ${artista.nombre}.`);
    setTimeout(() => setAbierto(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="self-start text-xs text-text-muted underline-offset-2 hover:text-text-secondary hover:underline"
      >
        + «{nombre}» es otro nombre de…
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60"
          onClick={() => setAbierto(false)}
        >
          <div
            className="flex max-h-[75dvh] flex-col gap-3 rounded-t-[18px] bg-bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-text-primary">
              ¿De qué artista es otro nombre «{nombre}»?
            </p>
            <input
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              placeholder="Buscar artista…"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-h-10 rounded-[10px] border border-border bg-bg-dark/60 px-3 text-sm text-text-primary outline-none focus:border-accent"
            />
            {mensaje ? (
              <p className="text-xs text-[var(--accent-cancionero)]">{mensaje}</p>
            ) : null}
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filtrados.map((artista) => (
                <li key={artista.id}>
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void elegir(artista)}
                    className="w-full rounded-[8px] px-2 py-2.5 text-left text-sm text-text-primary hover:bg-bg-dark/60 disabled:opacity-50"
                  >
                    {artista.nombre}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-sm text-text-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
