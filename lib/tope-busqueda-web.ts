const VENTANA_MS = 10 * 60 * 1000;
const TOPE = 20;

const marcas = new Map<string, number[]>();

/** Una persona busca a mano. Veinte veces en diez minutos alcanza; más que eso es una ráfaga. */
export function tomarCupoBusquedaWeb(
  userId: string,
): { ok: true } | { ok: false } {
  const ahora = Date.now();
  const previas = (marcas.get(userId) ?? []).filter((marca) => ahora - marca < VENTANA_MS);

  if (previas.length >= TOPE) {
    marcas.set(userId, previas);
    return { ok: false };
  }

  previas.push(ahora);
  marcas.set(userId, previas);
  return { ok: true };
}
