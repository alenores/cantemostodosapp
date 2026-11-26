"use client";

import { getActiveUserId } from "@/lib/auth/offline-user";
import { EVENTO_CONEXION } from "@/lib/conexion";
import {
  EVENTO_SOLICITUDES,
  contarAvisos,
  enviarSolicitudesPendientes,
  leerSolicitudesGuardadas,
  leerSolicitudesSinEnviar,
  refrescarSolicitudes,
  type Solicitud,
  type SolicitudSinEnviar,
} from "@/lib/solicitudes";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type EstadoSolicitudes = {
  /** `undefined` mientras se averigua la cuenta; `null` para invitados. */
  userId: string | null | undefined;
  lista: Solicitud[];
  sinEnviar: SolicitudSinEnviar[];
  avisos: number;
  /** Pedidos sin señal que, al enviarse, ya estaban pedidos o cargados. */
  repetidas: SolicitudSinEnviar[];
  limpiarRepetidas: () => void;
};

/**
 * Lista de solicitudes, pedidos sin enviar y campanita. Muestra lo guardado al instante y
 * refresca atrás; cuando vuelve la señal manda los pedidos que esperaban.
 */
export function useSolicitudes(): EstadoSolicitudes {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [lista, setLista] = useState<Solicitud[]>([]);
  const [sinEnviar, setSinEnviar] = useState<SolicitudSinEnviar[]>([]);
  const [repetidas, setRepetidas] = useState<SolicitudSinEnviar[]>([]);

  useEffect(() => {
    let activo = true;

    function leerLocal(id: string | null) {
      setLista(leerSolicitudesGuardadas());
      setSinEnviar(leerSolicitudesSinEnviar(id));
    }

    async function sincronizar() {
      const id = await getActiveUserId(supabase).catch(() => null);
      if (!activo) return;
      setUserId(id);
      leerLocal(id);
      if (id) {
        const rechazadas = await enviarSolicitudesPendientes(supabase, id).catch(() => []);
        if (activo && rechazadas.length > 0) setRepetidas((prev) => [...prev, ...rechazadas]);
      }
      await refrescarSolicitudes(supabase).catch(() => null);
    }

    function alCambiar() {
      void getActiveUserId(supabase)
        .then((id) => {
          if (activo) leerLocal(id);
        })
        .catch(() => {});
    }

    void sincronizar();
    const alVolverSenal = () => void sincronizar();
    window.addEventListener(EVENTO_SOLICITUDES, alCambiar);
    window.addEventListener(EVENTO_CONEXION, alVolverSenal);
    window.addEventListener("online", alVolverSenal);
    return () => {
      activo = false;
      window.removeEventListener(EVENTO_SOLICITUDES, alCambiar);
      window.removeEventListener(EVENTO_CONEXION, alVolverSenal);
      window.removeEventListener("online", alVolverSenal);
    };
  }, [supabase]);

  const limpiarRepetidas = useCallback(() => setRepetidas([]), []);

  return {
    userId,
    lista,
    sinEnviar,
    avisos: contarAvisos(lista, userId ?? null),
    repetidas,
    limpiarRepetidas,
  };
}
