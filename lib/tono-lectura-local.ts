import type { NotaIndex } from "@/lib/cifrado";

// Preferencia de lectura separada: nunca modifica la canción descargada.
export function readTonoLectura(userId: string | null, cancionId: number): NotaIndex | null {
  try {
    const value = localStorage.getItem(`tono-lectura-v1:${userId ?? "invitado"}:${cancionId}`);
    if (value === null) return null;
    const tone = Number(value);
    return Number.isInteger(tone) && tone >= 0 && tone < 12 ? tone as NotaIndex : null;
  } catch { return null; }
}

export function writeTonoLectura(userId: string | null, cancionId: number, tono: NotaIndex) {
  try { localStorage.setItem(`tono-lectura-v1:${userId ?? "invitado"}:${cancionId}`, String(tono)); }
  catch { /* La lectura sigue funcionando si el navegador bloquea preferencias. */ }
}
