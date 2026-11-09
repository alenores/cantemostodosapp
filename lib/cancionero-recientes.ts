const STORAGE_KEY = "cantemos-cancionero-recientes-v1";
const MAX_RECIENTES = 30;

function clave(usuarioId: string | null) {
  return usuarioId ?? "invitado";
}

function leerTodo(): Record<string, number[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const resultado: Record<string, number[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      resultado[key] = value
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
        .slice(0, MAX_RECIENTES);
    }
    return resultado;
  } catch {
    return {};
  }
}

function guardarTodo(todo: Record<string, number[]>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todo));
  } catch {
    // Sin espacio en el celular: la lista queda solo en esta visita.
  }
}

export function leerCancionesRecientes(usuarioId: string | null): number[] {
  return leerTodo()[clave(usuarioId)] ?? [];
}

export function recordarCancionReciente(
  usuarioId: string | null,
  cancionId: number,
): number[] {
  const todo = leerTodo();
  const key = clave(usuarioId);
  const anteriores = (todo[key] ?? []).filter((id) => id !== cancionId);
  const siguientes = [cancionId, ...anteriores].slice(0, MAX_RECIENTES);
  todo[key] = siguientes;
  guardarTodo(todo);
  return siguientes;
}
