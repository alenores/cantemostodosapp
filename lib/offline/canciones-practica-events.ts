export const CANCIONES_PRACTICA_LOCAL_EVENT = "canciones-practica-local-change";

export function dispatchCancionesPracticaLocalChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CANCIONES_PRACTICA_LOCAL_EVENT));
  }
}

