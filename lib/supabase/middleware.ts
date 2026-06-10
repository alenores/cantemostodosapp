import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase y escribe cookies en la respuesta.
 * Sin redirecciones: la protección de rutas sigue en cada Server Component.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  let sessionRefreshed = false;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          if (cookiesToSet.length > 0) {
            sessionRefreshed = true;
          }

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );

          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value),
            );
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development" && sessionRefreshed) {
    console.log(
      `Middleware: Token de sesión renovado para la ruta ${request.nextUrl.pathname}`,
    );
  }

  return supabaseResponse;
}
