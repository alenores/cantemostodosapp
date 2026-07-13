"use client";

import { fetchCancionesCancionero } from "@/lib/cancionero";
import {
  COLA_ALEATORIO_CARGA_INICIAL,
  COLA_ALEATORIO_PENDIENTES_MIN,
  pickCancionesAleatorias,
  type ColaAleatorioItem,
} from "@/lib/cola-aleatorio";
import type { CancionInput } from "@/lib/cola-logic";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

async function loadCancioneroPool(): Promise<CancionCancionero[]> {
  try {
    const supabase = createClient();
    const remote = await fetchCancionesCancionero(supabase);
    if (remote.length > 0) {
      return remote;
    }
  } catch {
    // fallback local abajo
  }

  try {
    return await getCancioneroLocalAsCancionero();
  } catch {
    return [];
  }
}

type UseColaAleatorioArgs = {
  items: ColaAleatorioItem[];
  pendientesCount: number;
  onAgregar: (cancion: CancionInput) => Promise<void>;
};

export function useColaAleatorio({
  items,
  pendientesCount,
  onAgregar,
}: UseColaAleatorioArgs) {
  const [aleatorioActivo, setAleatorioActivo] = useState(false);
  const refillInFlightRef = useRef(false);
  const toggleInFlightRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const agregarVarias = useCallback(
    async (canciones: CancionInput[]) => {
      for (const cancion of canciones) {
        await onAgregar(cancion);
      }
    },
    [onAgregar],
  );

  const apagarAleatorio = useCallback(() => {
    setAleatorioActivo(false);
  }, []);

  const toggleAleatorio = useCallback(async () => {
    if (toggleInFlightRef.current) {
      return;
    }

    if (aleatorioActivo) {
      setAleatorioActivo(false);
      return;
    }

    toggleInFlightRef.current = true;
    try {
      const pool = await loadCancioneroPool();
      const elegidas = pickCancionesAleatorias(
        pool,
        itemsRef.current,
        COLA_ALEATORIO_CARGA_INICIAL,
      );
      await agregarVarias(elegidas);
      setAleatorioActivo(true);
    } finally {
      toggleInFlightRef.current = false;
    }
  }, [aleatorioActivo, agregarVarias]);

  useEffect(() => {
    if (!aleatorioActivo) {
      return;
    }

    if (pendientesCount >= COLA_ALEATORIO_PENDIENTES_MIN) {
      return;
    }

    if (refillInFlightRef.current || toggleInFlightRef.current) {
      return;
    }

    let cancelled = false;
    refillInFlightRef.current = true;

    void (async () => {
      try {
        const pool = await loadCancioneroPool();
        if (cancelled) {
          return;
        }
        const elegidas = pickCancionesAleatorias(pool, itemsRef.current, 1);
        if (elegidas.length === 0 || cancelled) {
          return;
        }
        await onAgregar(elegidas[0]!);
      } finally {
        refillInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aleatorioActivo, pendientesCount, onAgregar]);

  return {
    aleatorioActivo,
    toggleAleatorio,
    apagarAleatorio,
  };
}
