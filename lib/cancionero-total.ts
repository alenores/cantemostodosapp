/** Última cantidad conocida del Cancionero. Se lee al instante y no pide internet. */
const CLAVE = "cancionero-total-v1";

export const CANCIONERO_TOTAL_EVENT = "cancionero-total";

export function leerTotalCancionero(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const total = Number(window.localStorage.getItem(CLAVE));
    return Number.isInteger(total) && total > 0 ? total : null;
  } catch {
    return null;
  }
}

/** Solo se guarda un número nuevo y válido. Un fallo de red no borra el anterior. */
export function guardarTotalCancionero(total: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isInteger(total) || total <= 0) return;
  if (leerTotalCancionero() === total) return;
  try {
    window.localStorage.setItem(CLAVE, String(total));
    window.dispatchEvent(new CustomEvent(CANCIONERO_TOTAL_EVENT));
  } catch {
    // Sin espacio o modo privado: la tarjeta sigue con el número anterior.
  }
}
