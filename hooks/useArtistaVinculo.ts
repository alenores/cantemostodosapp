"use client";

import {
  addArtista,
  addArtistaAlias,
  getArtistas,
  getArtistasAlias,
} from "@/lib/artistas";
import { recargarAliasBusqueda } from "@/lib/artistas-alias-busqueda";
import {
  normalizarNombreArtista,
  resolverArtista,
  type ArtistaMatchResultado,
} from "@/lib/artistas-match";
import { createClient } from "@/lib/supabase/client";
import type { Artista, ArtistaAlias } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export type ArtistaParaGuardar = {
  artista: string | null;
  /** undefined = no se pudo verificar: no tocar el vínculo que ya tenga la canción. */
  artista_id: string | null | undefined;
};

export type ArtistaVinculo = {
  /** Lista de artistas cargada (sin lista no se vincula ni se crea nada). */
  cargado: boolean;
  resultado: ArtistaMatchResultado;
  /** El texto actual ya se confirmó como artista nuevo. */
  nuevoConfirmado: boolean;
  elegir: (artista: Artista) => void;
  confirmarNuevo: () => void;
  deshacerNuevo: () => void;
  /** Devuelve nombre + id definitivos; crea el artista si es nuevo. Lanza Error si hay dudas sin resolver. */
  resolverParaGuardar: () => Promise<ArtistaParaGuardar>;
};

export const ARTISTA_DUDOSO_MENSAJE =
  "Revisá el artista: elegí uno de los sugeridos o tocá «Es otro artista».";

/**
 * Vincula el texto del campo Artista del editor con la tabla de artistas,
 * para que cada canción quede anotada con el artista correcto y no se dupliquen.
 */
export function useArtistaVinculo(
  texto: string,
  setTexto: (value: string) => void,
): ArtistaVinculo {
  const supabase = useMemo(() => createClient(), []);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [alias, setAlias] = useState<ArtistaAlias[]>([]);
  const [cargado, setCargado] = useState(false);
  const [nuevoConfirmadoNorm, setNuevoConfirmadoNorm] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    void Promise.all([getArtistas(supabase), getArtistasAlias(supabase)]).then(
      ([listaArtistas, listaAlias]) => {
        if (cancelado) return;
        setArtistas(listaArtistas);
        setAlias(listaAlias);
        setCargado(listaArtistas.length > 0);
      },
    );

    return () => {
      cancelado = true;
    };
  }, [supabase]);

  const resultado = useMemo(
    () => resolverArtista(texto, artistas, alias),
    [alias, artistas, texto],
  );

  const textoNorm = normalizarNombreArtista(texto);
  const nuevoConfirmado = Boolean(textoNorm) && nuevoConfirmadoNorm === textoNorm;

  const elegir = useCallback(
    (artista: Artista) => {
      const original = texto.trim();
      const originalNorm = normalizarNombreArtista(original);

      // Memoria: si venía escrito distinto, se anota ese nombre para la próxima.
      if (originalNorm && originalNorm !== normalizarNombreArtista(artista.nombre)) {
        void addArtistaAlias(supabase, artista.id, original).then((nuevo) => {
          if (!nuevo) return;
          setAlias((current) => [...current, nuevo]);
          void recargarAliasBusqueda(supabase);
        });
      }

      setNuevoConfirmadoNorm(null);
      setTexto(artista.nombre);
    },
    [setTexto, supabase, texto],
  );

  const confirmarNuevo = useCallback(() => {
    setNuevoConfirmadoNorm(textoNorm || null);
  }, [textoNorm]);

  const deshacerNuevo = useCallback(() => {
    setNuevoConfirmadoNorm(null);
  }, []);

  const resolverParaGuardar = useCallback(async (): Promise<ArtistaParaGuardar> => {
    const nombre = texto.trim();

    if (!nombre) return { artista: null, artista_id: null };
    // Sin lista de artistas (sin señal o error) se guarda solo el texto, como antes.
    if (!cargado) return { artista: nombre, artista_id: undefined };

    if (resultado.tipo === "seguro") {
      return { artista: resultado.artista.nombre, artista_id: resultado.artista.id };
    }

    if (resultado.tipo === "dudoso" && !nuevoConfirmado) {
      throw new Error(ARTISTA_DUDOSO_MENSAJE);
    }

    const creado = await addArtista(supabase, nombre, null);
    if (!creado) return { artista: nombre, artista_id: undefined };

    setArtistas((current) => [...current, creado]);
    setNuevoConfirmadoNorm(null);
    return { artista: creado.nombre, artista_id: creado.id };
  }, [cargado, nuevoConfirmado, resultado, supabase, texto]);

  return {
    cargado,
    resultado,
    nuevoConfirmado,
    elegir,
    confirmarNuevo,
    deshacerNuevo,
    resolverParaGuardar,
  };
}
