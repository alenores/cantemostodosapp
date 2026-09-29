"use client";

import { createClient } from "@/lib/supabase/client";
import { fetchCancionesCancionero } from "@/lib/cancionero";
import type { CancionCancionero } from "@/types";
import { useEffect, useMemo, useState } from "react";

type Props = {
  onSelect: (cancion: CancionCancionero, isOwner: boolean) => void;
};

export default function CifradoEditorBasicSongsTab({ onSelect }: Props) {
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!cancelled) setUserId(userId ?? null);
        if (!userId) {
          setCanciones([]);
          return;
        }

        const todas = await fetchCancionesCancionero(supabase);
        if (!cancelled) {
          setCanciones(
            todas.filter(
              (cancion) =>
                !cancion.tiene_cifrado_avanzado &&
                Boolean(cancion.letra?.trim()),
            ),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las letras básicas.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return canciones;
    return canciones.filter((cancion) =>
      `${cancion.nombre} ${cancion.artista ?? ""}`
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [canciones, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-estandar border border-border bg-bg-card p-3">
      <p className="shrink-0 text-sm text-text-muted">
        Canciones del cancionero que todavía no tienen acordes y compases editados.
      </p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-10 shrink-0 rounded-estandar border border-border bg-bg-dark px-3 text-sm text-text-primary outline-none focus:border-accent"
        placeholder="Buscar canción o artista…"
        aria-label="Buscar letras básicas"
      />
      {loading ? (
        <p className="py-6 text-center text-sm text-text-muted">Cargando…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          {canciones.length
            ? "No hay letras que coincidan con la búsqueda."
            : "No hay letras básicas pendientes de editar."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((cancion) => (
            <button
              key={cancion.id}
              type="button"
              onClick={() => onSelect(cancion, cancion.user_id === userId)}
              className="rounded-estandar border border-border bg-bg-dark px-3 py-3 text-left hover:border-accent/60"
            >
              <span className="block font-semibold text-text-primary">{cancion.nombre}</span>
              <span className="block text-sm text-text-muted">
                {cancion.artista || "Artista sin nombre"}
              </span>
              {cancion.user_id !== userId ? (
                <span className="mt-1 block text-xs text-text-faint">
                  Se abrirá como copia en tu cancionero
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
