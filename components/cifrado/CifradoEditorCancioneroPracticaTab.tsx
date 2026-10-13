"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { filterCancionesCancionero } from "@/lib/cancionero";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import type { CancionCancionero } from "@/types";
import { useEffect, useMemo, useState } from "react";

type Props = {
  onSelect: (cancion: CancionCancionero) => Promise<void> | void;
};

export default function CifradoEditorCancioneroPracticaTab({ onSelect }: Props) {
  const online = useOnlineStatus();
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligiendoId, setEligiendoId] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCancioneroLocalAsCancionero();
        if (!cancelado) setCanciones(data);
      } catch (loadError) {
        if (!cancelado) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las canciones.",
          );
          setCanciones([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelado = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterCancionesCancionero(canciones, query),
    [canciones, query],
  );

  async function elegir(cancion: CancionCancionero) {
    setEligiendoId(cancion.id);
    setError(null);
    try {
      await onSelect(cancion);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "No se pudo agregar la canción",
      );
      setEligiendoId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-estandar border border-border bg-bg-card p-3">
      <p className="shrink-0 text-sm text-text-muted">
        Elegí una canción. Se abre en el entrenador y queda una copia solo para vos.
      </p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-10 shrink-0 rounded-estandar border border-border bg-bg-dark px-3 text-sm text-text-primary outline-none focus:border-accent"
        placeholder="Buscar canción o artista…"
        aria-label="Buscar en el cancionero"
      />
      {!online ? (
        <p className="shrink-0 text-sm text-text-muted">
          Sin conexión · se usan las canciones guardadas en este celular.
        </p>
      ) : null}
      {loading ? (
        <p className="py-6 text-center text-sm text-text-muted">Cargando…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          {canciones.length
            ? "No hay canciones que coincidan con la búsqueda."
            : "No hay canciones para mostrar."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((cancion) => (
            <TapButton
              key={cancion.id}
              type="button"
              disabled={eligiendoId !== null}
              onClick={() => void elegir(cancion)}
              className="rounded-estandar border border-border bg-bg-dark px-3 py-3 text-left hover:border-accent/60 disabled:opacity-50"
            >
              <span className="block font-semibold text-text-primary">
                {cancion.nombre}
                {eligiendoId === cancion.id ? "…" : ""}
              </span>
              {cancion.artista ? (
                <span className="block text-sm text-text-muted">{cancion.artista}</span>
              ) : null}
            </TapButton>
          ))}
        </div>
      )}
    </div>
  );
}
