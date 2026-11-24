const STORAGE_KEY = "cantemos-artistas-recientes-v1";
const MAX_RECIENTES = 20;

function clave(usuarioId: string | null) {
  return usuarioId ?? "invitado";
}

function leerTodo(): Record<string, string[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const resultado: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      resultado[key] = value
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, MAX_RECIENTES);
    }
    return resultado;
  } catch {
    return {};
  }
}

function guardarTodo(todo: Record<string, string[]>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todo));
  } catch {
    // Sin espacio en el celular: la lista queda solo en esta visita.
  }
}

export function leerArtistasRecientes(usuarioId: string | null): string[] {
  return leerTodo()[clave(usuarioId)] ?? [];
}

export function recordarArtistaReciente(
  usuarioId: string | null,
  artistaId: string,
): string[] {
  const todo = leerTodo();
  const key = clave(usuarioId);
  const anteriores = (todo[key] ?? []).filter((id) => id !== artistaId);
  const siguientes = [artistaId, ...anteriores].slice(0, MAX_RECIENTES);
  todo[key] = siguientes;
  guardarTodo(todo);
  return siguientes;
}
