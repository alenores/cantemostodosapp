"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import ArtistaPickerSheet, { ArtistaAvatar } from "@/components/cifrado/ArtistaPickerSheet";
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
  const [abierto, setAbierto] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);
  const detectado = textoDetectado.trim();
  const elegido = artistaId ? artistas.find((a) => a.id === artistaId) : undefined;

  const coincidencia = useMemo(
    () => buscarArtistaCoincidente(detectado, artistas),
    [detectado, artistas],
  );
  const sugeridos = coincidencia.exacto ? [coincidencia.exacto] : coincidencia.parecidos;
  const mostrarDetectado = !elegido && detectado.length > 0 && artistas.length > 0;

  async function agregarALista(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio) return;
    const existente = buscarArtistaCoincidente(limpio, artistas).exacto;
    if (existente) {
      onElegir(existente);
      setAbierto(false);
      return;
    }
    setAgregando(true);
    setErrorAgregar(null);
    const creado = await addArtista(createClient(), limpio, null);
    setAgregando(false);
    if (!creado) {
      setErrorAgregar("No se pudo agregar. Probá de nuevo.");
      return;
    }
    onAgregado?.(creado);
    onElegir(creado);
    setAbierto(false);
  }

  return (
    <div>
      <button
        id={id}
        type="button"
        onClick={() => setAbierto(true)}
        className={`${selectClassName} flex items-center gap-2 text-left`}
      >
        {elegido ? (
          <ArtistaAvatar artista={elegido} size="size-6" />
        ) : null}
        <span className={`min-w-0 flex-1 truncate ${elegido ? "" : "opacity-60"}`}>
          {elegido ? elegido.nombre : "Elegir artista…"}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
      </button>

      {abierto ? (
        <ArtistaPickerSheet
          artistas={artistas}
          artistaId={elegido?.id ?? null}
          textoParaAgregar={elegido ? "" : detectado}
          sugeridos={elegido ? [] : sugeridos}
          agregando={agregando}
          onElegir={(artista) => {
            onElegir(artista);
            setAbierto(false);
          }}
          onAgregar={(nombre) => void agregarALista(nombre)}
          onClose={() => setAbierto(false)}
        />
      ) : null}

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
                  className="rounded-full border border-border px-2 py-0.5 font-medium text-text-primary hover:bg-bg-card-hover"
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
                onClick={() => void agregarALista(detectado)}
                className="rounded-full border border-dashed border-border px-2 py-0.5 font-medium text-text-primary hover:bg-bg-card-hover disabled:opacity-60"
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
