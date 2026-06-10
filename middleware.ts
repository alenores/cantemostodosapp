import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ejecutar solo en rutas de la app que pueden llevar sesión.
     * Excluye:
     * - _next/static, _next/image (assets de Next)
     * - archivos estáticos por extensión (public/)
     * - favicon.ico
     * - login y registro (públicos; sin refresco en cada visita)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|auth/login|auth/registro|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
