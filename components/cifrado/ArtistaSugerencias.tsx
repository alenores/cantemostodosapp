"use client";

import { useMemo } from "react";
import { buscarArtistaCoincidente } from "@/lib/artistas-match";
import type { Artista } from "@/types";

type Props = {
  /** Texto del artista tal como quedó (escrito, pegado o traído de la web). */
  texto: string;
  artistas: Artista[];
  /** Artista ya elegido de la lista; si coincide con el texto no se sugiere nada. */
  artistaIdElegido?: string | null;
  /** Mostrar el texto detectado cuando no está en la lista (el selector de PC no lo muestra). */
  mostrarTextoDetectado?: boolean;
  onElegir: (artista: Artista) => void;
};

export default function ArtistaSugerencias({
  texto,
  artistas,
  artistaIdElegido,
  mostrarTextoDetectado = false,
  onElegir,
}: Props) {
  const coincidencia = useMemo(
    () => buscarArtistaCoincidente(texto, artistas),
    [texto, artistas],
  );

  const limpio = texto.trim();
  if (!limpio || artistas.length === 0) return null;

  const { exacto, parecidos } = coincidencia;
  if (exacto && (exacto.id === artistaIdElegido || exacto.nombre === limpio)) {
    return null;
  }

  const opciones = exacto ? [exacto] : parecidos;
  if (opciones.length === 0) {
    return mostrarTextoDetectado && !artistaIdElegido ? (
      <p className="mt-1 text-xs text-text-secondary">
        «{limpio}» no está en la lista de artistas.
      </p>
    ) : null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
      <span>
        {mostrarTextoDetectado ? `«${limpio}»: ¿es ` : "¿Es "}
      </span>
      {opciones.map((artista, index) => (
        <span key={artista.id} className="inline-flex items-center gap-1">
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
      <span>?</span>
    </div>
  );
}
