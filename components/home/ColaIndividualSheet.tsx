"use client";

import ColaIndividual from "@/components/home/ColaIndividual";
import {
  eliminarDeColaIndividual,
  getColaIndividual,
  persistirOrdenColaIndividual,
} from "@/lib/cola-individual";
import { createClient } from "@/lib/supabase/client";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { ColaIndividualItem, UsuarioActivo } from "@/types";
import { ChevronDown, ChevronUp, ListMusic } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ColaIndividualSheetProps = {
  modo: "colapsable" | "sheet";
  onActivarCancion: (item: ColaIndividualItem) => void;
};

function ColaVaciaMessage() {
  return (
    <p className="px-4 py-4 text-center text-xs text-text-muted">
      Cola vacía · buscá una canción para agregarla
    </p>
  );
}

export default function ColaIndividualSheet({
  modo,
  onActivarCancion,
}: ColaIndividualSheetProps) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ColaIndividualItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioActivo | null>(null);
  const [expandido, setExpandido] = useState(false);

  const loadCola = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setUsuario(null);
      setItems([]);
      setLoadError(formatDatabaseError(userError, "No se pudo validar la sesión"));
      setLoading(false);
      return;
    }

    if (!user) {
      setUsuario(null);
      setItems([]);
      setLoading(false);
      return;
    }

    setUsuario(mapUserToUsuarioActivo(user));

    try {
      const cola = await getColaIndividual(supabase);
      setItems(cola);
    } catch (error) {
      console.error("[cola-individual] error al cargar", error);
      setItems([]);
      setLoadError(
        formatDatabaseError(error, "No se pudo cargar la cola individual"),
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCola();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void loadCola();
      }

      if (event === "SIGNED_OUT") {
        setUsuario(null);
        setItems([]);
        setLoadError(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCola, supabase]);

  const handleReorder = useCallback(
    (newItems: ColaIndividualItem[]) => {
      setItems(newItems);
      void persistirOrdenColaIndividual(supabase, newItems).catch((error) => {
        console.error("[cola-individual] error al persistir orden", error);
      });
    },
    [supabase],
  );

  const handleEliminar = useCallback(
    (id: number) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      void eliminarDeColaIndividual(supabase, id).catch((error) => {
        console.error("[cola-individual] error al eliminar", error);
      });
    },
    [supabase],
  );

  const handleActivar = useCallback(
    (item: ColaIndividualItem) => {
      onActivarCancion(item);
    },
    [onActivarCancion],
  );

  if (loading || usuario === null) {
    return null;
  }

  const lista =
    loadError !== null ? (
      <p className="px-4 py-4 text-center text-xs text-red-400">{loadError}</p>
    ) : items.length === 0 ? (
      <ColaVaciaMessage />
    ) : (
      <ColaIndividual
        items={items}
        onReorder={handleReorder}
        onEliminar={handleEliminar}
        onActivar={handleActivar}
      />
    );

  if (modo === "sheet") {
    return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{lista}</div>;
  }

  return (
    <div className="shrink-0 border-t border-border bg-bg-dark">
      <button
        type="button"
        onClick={() => setExpandido((open) => !open)}
        className="flex h-[52px] w-full items-center gap-2 px-4"
      >
        <ListMusic className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="text-sm text-text-secondary">Cola individual</span>
        <span className="text-xs text-text-muted">{items.length}</span>
        <span className="ml-auto text-text-muted">
          {expandido ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronUp className="size-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {expandido ? (
        <div className="max-h-[280px] overflow-y-auto">{lista}</div>
      ) : null}
    </div>
  );
}
