"use client";

import {
  recordarCategoriaConocida,
  type CategoriaUsuario,
} from "@/lib/usuarios-categorias";
import { useEffect } from "react";

/** Deja anotado el permiso de esta entrada para no volver a preguntarlo. */
export default function RecordarEntrada({
  userId,
  categoria,
}: {
  userId: string | null;
  categoria: CategoriaUsuario | null;
}) {
  useEffect(() => {
    if (!userId || !categoria) return;
    recordarCategoriaConocida(userId, categoria);
  }, [userId, categoria]);

  return null;
}
