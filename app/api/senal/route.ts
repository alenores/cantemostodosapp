/**
 * Prueba de señal (`lib/conexion.ts`): responde vacío y al toque. Lo único que importa es si la
 * respuesta llega a tiempo. Nunca se guarda: ni el navegador ni el motor offline (regla propia en
 * `app/sw.ts`), porque una copia guardada diría «hay señal» sin haber señal.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
