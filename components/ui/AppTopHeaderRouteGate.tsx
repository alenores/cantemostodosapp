"use client";

import AppTopHeader from "@/components/ui/AppTopHeader";
import type { UsuarioActivo } from "@/types";
import { usePathname } from "next/navigation";

const MOBILE_HEADER_HIDDEN_PATHS = [
  "/canciones/editor",
  "/practica/entrenador-canciones/editor",
] as const;

function shouldHideMobileAppTopHeader(pathname: string): boolean {
  return MOBILE_HEADER_HIDDEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

type AppTopHeaderRouteGateProps = {
  usuario: UsuarioActivo;
};

export default function AppTopHeaderRouteGate({
  usuario,
}: AppTopHeaderRouteGateProps) {
  const pathname = usePathname();

  if (shouldHideMobileAppTopHeader(pathname)) {
    return null;
  }

  return <AppTopHeader usuario={usuario} />;
}
