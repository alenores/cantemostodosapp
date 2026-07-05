"use client";

import { fetchCancionCifradoDetalle } from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { CancionCifradoDetalle } from "@/types";
import { useEffect, useState } from "react";

export function useCifradoDetalle(cancioneroId: number | null) {
  const online = useOnlineStatus();
  const [detalle, setDetalle] = useState<CancionCifradoDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cancioneroId == null || !online) {
      setDetalle(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDetalle(null);

    const supabase = createClient();

    void fetchCancionCifradoDetalle(supabase, cancioneroId)
      .then((result) => {
        if (!cancelled) {
          setDetalle(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetalle(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cancioneroId, online]);

  return {
    detalle,
    loading,
    tieneCifradoAvanzado: Boolean(detalle?.tiene_cifrado_avanzado),
  };
}
