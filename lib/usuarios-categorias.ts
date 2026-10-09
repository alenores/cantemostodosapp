import { hayConexion } from "@/lib/conexion";
import type { CancionCancionero } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Categoría global de la cuenta (tabla `usuarios_categorias`). */
export type CategoriaUsuario = "dueno" | "amigos" | "publico";

const CATEGORIA_STORAGE_PREFIX = "cantemos-categoria-usuario:";
export const CATEGORIA_COOKIE = "cantemos-categoria";

function normalizeCategoriaUsuario(value: unknown): CategoriaUsuario | null {
  return value === "dueno" || value === "amigos" || value === "publico"
    ? value
    : null;
}

/** Dueño y amigos suman canciones al Cancionero; el público no. */
export function puedeSumarCanciones(categoria: CategoriaUsuario | null): boolean {
  return categoria === "dueno" || categoria === "amigos";
}

/**
 * Editar o eliminar una canción del Cancionero:
 * dueño → cualquiera; amigos → solo las que subió; público → ninguna.
 */
export function puedeEditarCancionCancionero(
  cancion: Pick<CancionCancionero, "user_id">,
  usuarioId: string | null,
  categoria: CategoriaUsuario | null,
): boolean {
  if (usuarioId === null) return false;
  if (categoria === "dueno") return true;
  return categoria === "amigos" && cancion.user_id === usuarioId;
}

/** Dueño y amigos pueden marcar una canción como revisada. El público no. */
export function puedeValidarCancion(categoria: CategoriaUsuario | null): boolean {
  return categoria === "dueno" || categoria === "amigos";
}

/** Quitar el tilde: quien lo puso, y el dueño. */
export function puedeQuitarValidacion(
  cancion: { validada_por?: string | null },
  usuarioId: string | null,
  categoria: CategoriaUsuario | null,
): boolean {
  if (!cancion.validada_por || usuarioId === null) return false;
  if (categoria === "dueno") return true;
  return cancion.validada_por === usuarioId;
}

export function leerCategoriaGuardada(userId: string): CategoriaUsuario | null {
  try {
    return normalizeCategoriaUsuario(
      window.localStorage.getItem(`${CATEGORIA_STORAGE_PREFIX}${userId}`),
    );
  } catch {
    return null;
  }
}

export function parseCategoriaCookie(
  raw: string | undefined,
  userId: string,
): CategoriaUsuario | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  if (decoded.slice(0, sep) !== userId) return null;
  return normalizeCategoriaUsuario(decoded.slice(sep + 1));
}

export function recordarCategoriaEnCookie(
  userId: string,
  categoria: CategoriaUsuario | null,
) {
  if (typeof document === "undefined") return;
  if (!categoria) {
    document.cookie = `${CATEGORIA_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const value = encodeURIComponent(`${userId}:${categoria}`);
  document.cookie = `${CATEGORIA_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function olvidarCategoriaRecordada() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(CATEGORIA_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Sin almacenamiento.
  }
  if (typeof document !== "undefined") {
    document.cookie = `${CATEGORIA_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

function guardarCategoria(userId: string, categoria: CategoriaUsuario | null) {
  try {
    const key = `${CATEGORIA_STORAGE_PREFIX}${userId}`;
    if (categoria) window.localStorage.setItem(key, categoria);
    else window.localStorage.removeItem(key);
  } catch {
    // Sin almacenamiento: se vuelve a consultar la próxima vez.
  }
  recordarCategoriaEnCookie(userId, categoria);
}

/**
 * Categoría de la cuenta. Con señal consulta la base y recuerda el resultado;
 * sin señal (o si la consulta falla) devuelve la última conocida.
 */
export async function obtenerCategoriaUsuario(
  supabase: SupabaseClient,
  userId: string,
  opciones?: { refrescar?: boolean },
): Promise<CategoriaUsuario | null> {
  const guardada = leerCategoriaGuardada(userId);
  if (guardada && !opciones?.refrescar) {
    recordarCategoriaEnCookie(userId, guardada);
    return guardada;
  }

  if (!hayConexion()) return guardada;

  try {
    const { data, error } = await supabase
      .from("usuarios_categorias")
      .select("categoria")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return leerCategoriaGuardada(userId);

    const categoria = normalizeCategoriaUsuario(data?.categoria);
    guardarCategoria(userId, categoria);
    return categoria;
  } catch {
    return leerCategoriaGuardada(userId);
  }
}

/** Guarda el permiso ya conocido, en el celular y en la cookie, sin volver a preguntar. */
export function recordarCategoriaConocida(
  userId: string,
  categoria: CategoriaUsuario | null,
) {
  guardarCategoria(userId, categoria);
}
