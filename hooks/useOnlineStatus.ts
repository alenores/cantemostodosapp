"use client";

import {
  EVENTO_CONEXION,
  hayConexion,
  iniciarVigilanciaDeConexion,
} from "@/lib/conexion";
import { useEffect, useState } from "react";

/**
 * «Con señal» es señal **que sirve** (`lib/conexion.ts`): con red pero sin respuesta a tiempo —una
 * rayita que no deja pasar nada— da `false`, igual que con modo avión, y la app usa su modo sin
 * señal de siempre.
 */
export function useOnlineStatus(): boolean {
  // El primer render coincide con el servidor; el efecto lee la conexión real al montar.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function syncOnlineStatus() {
      setOnline(hayConexion());
    }

    iniciarVigilanciaDeConexion();
    syncOnlineStatus();

    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    window.addEventListener(EVENTO_CONEXION, syncOnlineStatus);
    window.addEventListener("focus", syncOnlineStatus);
    document.addEventListener("visibilitychange", syncOnlineStatus);

    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
      window.removeEventListener(EVENTO_CONEXION, syncOnlineStatus);
      window.removeEventListener("focus", syncOnlineStatus);
      document.removeEventListener("visibilitychange", syncOnlineStatus);
    };
  }, []);

  return online;
}
