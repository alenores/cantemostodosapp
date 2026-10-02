"use client";

import { useMemo, useState } from "react";
import { addArtista } from "@/lib/artistas";
import { buscarArtistaCoincidente } from "@/lib/artistas-match";
import { createClient } from "@/lib/supabase/client";
import type { Artista } from "@/types";

type Props = {
  id?: string;
  artistas: Artista[];
  /** Ficha elegida de la lista. */
  artistaId: string | null;
  /** Nombre que llegó de afuera (pegado, web, intercambio) y todavía no está vinculado. */
  textoDetectado?: string;
  selectClassName: string;
  onElegir: (artista: Artista | null) => void;
  /** Se llama con el artista recién agregado a la lista, para sumarlo a la lista local. */
  onAgregado?: (artista: Artista) => void;
};

/**
 * El artista se elige siempre de la lista. Si llegó un nombre que no está,
 * se muestra, se sugieren los parecidos y se puede agregar a la lista con un toque.
 */
export default function ArtistaSelector({
  id,
  artistas,
  artistaId,
  textoDetectado = "",
  selectClassName,
  onElegir,
  onAgregado,
}: Props) {
  const [agregando, setAgregando] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  const detectado = textoDetectado.trim();
  const elegido = artistaId ? artistas.find((a) => a.id === artistaId) : undefined;

  const coincidencia = useMemo(
    () => buscarArtistaCoincidente(detectado, artistas),
    [detectado, artistas],
  );
  const sugeridos = coincidencia.exacto ? [coincidencia.exacto] : coincidencia.parecidos;
  const mostrarDetectado = !elegido && detectado.length > 0 && artistas.length > 0;

  async function agregarALista() {
    if (coincidencia.exacto) {
      onElegir(coincidencia.exacto);
      return;
    }
    setAgregando(true);
    setErrorAgregar(null);
    const creado = await addArtista(createClient(), detectado, null);
    setAgregando(false);
    if (!creado) {
      setErrorAgregar("No se pudo agregar. Probá de nuevo.");
      return;
    }
    onAgregado?.(creado);
    onElegir(creado);
  }

  return (
    <div>
      <select
        id={id}
        value={elegido ? elegido.id : ""}
        onChange={(event) => {
          const value = event.target.value;
          onElegir(value ? artistas.find((a) => a.id === value) ?? null : null);
        }}
        className={selectClassName}
      >
        <option value="">Sin artista / Elegir…</option>
        {artistas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>

      {mostrarDetectado ? (
        <div className="mt-1.5 space-y-1.5 text-xs text-text-secondary">
          <p>
            Se detectó «{detectado}»
            {coincidencia.exacto ? "." : ", que no está en la lista."}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {sugeridos.length > 0 ? <span>¿Es</span> : null}
            {sugeridos.map((artista, index) => (
              <span key={artista.id} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span>o</span> : null}
                <button
                  type="button"
                  onClick={() => onElegir(artista)}
                  className="rounded-full border border-border px-2 py-0.5 font-medium text-text-primary hover:bg-bg-hover"
                >
                  {artista.nombre}
                </button>
              </span>
            ))}
            {sugeridos.length > 0 ? <span>?</span> : null}
            {!coincidencia.exacto ? (
              <button
                type="button"
                disabled={agregando}
                onClick={() => void agregarALista()}
                className="rounded-full border border-dashed border-border px-2 py-0.5 font-medium text-text-primary hover:bg-bg-hover disabled:opacity-60"
              >
                {agregando ? "Agregando…" : `+ Agregar «${detectado}» a la lista`}
              </button>
            ) : null}
          </div>
          {errorAgregar ? <p>{errorAgregar}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
