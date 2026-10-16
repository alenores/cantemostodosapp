"use client";

import { useCategoriaUsuario } from "@/hooks/useCategoriaUsuario";
import { useHaySesion } from "@/hooks/useHaySesion";
import { esDuenoOAmigos } from "@/lib/usuarios-categorias";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Práctica es solo para cuentas: el invitado vuelve al inicio.
 * El Entrenador Vocal es de dueño y amigos: el público vuelve a Práctica.
 */
export default function PracticaAcceso() {
  const router = useRouter();
  const pathname = usePathname();
  const haySesion = useHaySesion();
  const categoria = useCategoriaUsuario();

  useEffect(() => {
    if (haySesion === false) {
      router.replace("/");
      return;
    }
    if (
      pathname.startsWith("/practica/entrenador-vocal") &&
      categoria !== null &&
      !esDuenoOAmigos(categoria)
    ) {
      router.replace("/practica");
    }
  }, [haySesion, categoria, pathname, router]);

  return null;
}
