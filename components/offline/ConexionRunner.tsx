"use client";

import { iniciarVigilanciaDeConexion } from "@/lib/conexion";
import { useEffect } from "react";

/** Arranca la vigilancia de la señal apenas abre la app (`lib/conexion.ts`). No dibuja nada. */
export default function ConexionRunner() {
  useEffect(() => {
    iniciarVigilanciaDeConexion();
  }, []);

  return null;
}
