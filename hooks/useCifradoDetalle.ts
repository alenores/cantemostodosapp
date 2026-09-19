"use client";

import { fetchCancionCifradoDetalle } from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { CancionCifradoDetalle } from "@/types";
import { getCancioneroLocalCifradoDetalle } from "@/lib/offline/cancionero-store";
import { useEffect, useState } from "react";

export function useCifradoDetalle(cancioneroId: number | null) {
  const online = useOnlineStatus();
  const [detalle, setDetalle] = useState<CancionCifradoDetalle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (cancioneroId == null) {
        if (!cancelled) {
          setDetalle(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      const local = await getCancioneroLocalCifradoDetalle(cancioneroId);

      if (cancelled) {
        return;
      }

      setDetalle(local);

      if (!online) {
        setLoading(false);
        return;
      }

      try {
        const remote = await fetchCancionCifradoDetalle(
          createClient(),
          cancioneroId,
        );

        if (!cancelled) {
          setDetalle(remote ?? local);
        }
      } catch {
        if (!cancelled) {
          setDetalle(local);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

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
