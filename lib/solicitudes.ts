import { hayConexion } from "@/lib/conexion";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Solicitudes de canciones (2026-11-26).
 *
 * Cualquiera ve la lista; solo con cuenta se pide. Un agente de IA las carga al Cancionero a nombre
 * de quien la pidió (regla del agente: `docs/agente-solicitudes.md`). Tabla y funciones:
 * `supabase/solicitudes-canciones.sql`.
 *
 * Lo guardado primero: la lista y los pedidos sin enviar viven en el celular (localStorage) y se
 * muestran al instante. Con señal se refresca atrás y se mandan los pedidos que esperaban.
 */

export const SOLICITUDES_HREF = "/canciones/solicitudes";

export type EstadoSolicitud = "pendiente" | "cargada" | "ya_existia" | "en_revision" | "no_se_pudo";

export type Solicitud = {
  id: number;
  user_id: string;
  nombre: string;
  artista: string;
  estado: EstadoSolicitud;
  cancion_id: number | null;
  aviso_visto: boolean;
  created_at: string;
  procesada_en: string | null;
};

/** Pedido hecho sin señal, esperando para enviarse. */
export type SolicitudSinEnviar = {
  localId: string;
  userId: string;
  nombre: string;
  artista: string;
  artistaId: string | null;
  createdAt: string;
};

export type DuplicadoSolicitud = {
  tipo: "cancionero" | "solicitud";
  id: number;
  nombre: string;
  artista: string | null;
  estado?: EstadoSolicitud;
};

export const ESTADOS_PROCESADOS: readonly EstadoSolicitud[] = [
  "cargada",
  "ya_existia",
  "en_revision",
  "no_se_pudo",
];

/** Estados que encienden la campanita de quien pidió. «En revisión» no avisa. */
export const ESTADOS_CON_AVISO: readonly EstadoSolicitud[] = ["cargada", "ya_existia", "no_se_pudo"];

/** Cambió la lista, los pedidos sin enviar o los avisos. */
export const EVENTO_SOLICITUDES = "solicitudes-cambio";

const CLAVE_LISTA = "cantemos-solicitudes-lista";
const CLAVE_SIN_ENVIAR = "cantemos-solicitudes-sin-enviar";
const COLUMNAS = "id, user_id, nombre, artista, estado, cancion_id, aviso_visto, created_at, procesada_en";

function leerJson<T>(clave: string, porDefecto: T): T {
  if (typeof window === "undefined") return porDefecto;
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardarJson(clave: string, valor: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin lugar en el celular: la lista se vuelve a pedir la próxima vez.
  }
  window.dispatchEvent(new Event(EVENTO_SOLICITUDES));
}

export function leerSolicitudesGuardadas(): Solicitud[] {
  return leerJson<Solicitud[]>(CLAVE_LISTA, []);
}

export function leerSolicitudesSinEnviar(userId: string | null): SolicitudSinEnviar[] {
  if (!userId) return [];
  return leerJson<SolicitudSinEnviar[]>(CLAVE_SIN_ENVIAR, []).filter((s) => s.userId === userId);
}

/** Trae la lista entera y la deja guardada en el celular. */
export async function refrescarSolicitudes(supabase: SupabaseClient): Promise<Solicitud[] | null> {
  if (!hayConexion()) return null;
  const { data, error } = await supabase
    .from("solicitudes_canciones")
    .select(COLUMNAS)
    .order("created_at", { ascending: true });
  if (error || !data) return null;
  const lista = data as Solicitud[];
  guardarJson(CLAVE_LISTA, lista);
  return lista;
}

/** Cuántos avisos sin ver tiene esta cuenta (campanita de la tarjeta). */
export function contarAvisos(lista: Solicitud[], userId: string | null): number {
  if (!userId) return 0;
  return lista.filter(
    (s) => s.user_id === userId && !s.aviso_visto && ESTADOS_CON_AVISO.includes(s.estado),
  ).length;
}

/** Al abrir la pantalla, los avisos de esta cuenta quedan vistos. */
export async function marcarAvisosVistos(supabase: SupabaseClient, userId: string): Promise<void> {
  const lista = leerSolicitudesGuardadas();
  if (contarAvisos(lista, userId) === 0) return;
  guardarJson(
    CLAVE_LISTA,
    lista.map((s) =>
      s.user_id === userId && ESTADOS_CON_AVISO.includes(s.estado) ? { ...s, aviso_visto: true } : s,
    ),
  );
  if (!hayConexion()) return;
  await supabase.rpc("marcar_solicitudes_vistas");
}

export async function buscarDuplicadoRemoto(
  supabase: SupabaseClient,
  nombre: string,
  artista: string,
  artistaId: string | null,
): Promise<DuplicadoSolicitud | null | undefined> {
  if (!hayConexion()) return undefined;
  const { data, error } = await supabase.rpc("buscar_duplicado_solicitud", {
    p_nombre: nombre,
    p_artista: artista,
    p_artista_id: artistaId,
  });
  if (error) return undefined;
  return (data as DuplicadoSolicitud | null) ?? null;
}

export type ResultadoSolicitar =
  | { tipo: "enviada" }
  | { tipo: "guardada-sin-senal" }
  | { tipo: "duplicado"; duplicado: DuplicadoSolicitud }
  | { tipo: "error"; mensaje: string };

async function enviar(
  supabase: SupabaseClient,
  nombre: string,
  artista: string,
  artistaId: string | null,
): Promise<ResultadoSolicitar> {
  const { data, error } = await supabase.rpc("solicitar_cancion", {
    p_nombre: nombre,
    p_artista: artista,
    p_artista_id: artistaId,
  });
  if (error) return { tipo: "error", mensaje: error.message };
  const respuesta = data as { ok: boolean; duplicado?: DuplicadoSolicitud | null };
  if (!respuesta.ok && respuesta.duplicado) return { tipo: "duplicado", duplicado: respuesta.duplicado };
  if (!respuesta.ok) return { tipo: "error", mensaje: "No se pudo enviar la solicitud." };
  return { tipo: "enviada" };
}

/** Pide una canción. Sin señal queda guardada en el celular y se manda al volver. */
export async function solicitarCancion(
  supabase: SupabaseClient,
  userId: string,
  nombre: string,
  artista: string,
  artistaId: string | null,
): Promise<ResultadoSolicitar> {
  const limpio = { nombre: nombre.trim(), artista: artista.trim() };
  if (!hayConexion()) {
    const todas = leerJson<SolicitudSinEnviar[]>(CLAVE_SIN_ENVIAR, []);
    todas.push({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      ...limpio,
      artistaId,
      createdAt: new Date().toISOString(),
    });
    guardarJson(CLAVE_SIN_ENVIAR, todas);
    return { tipo: "guardada-sin-senal" };
  }
  const resultado = await enviar(supabase, limpio.nombre, limpio.artista, artistaId);
  if (resultado.tipo === "enviada") void refrescarSolicitudes(supabase);
  return resultado;
}

/**
 * Manda los pedidos que esperaban señal. Devuelve los que resultaron repetidos
 * (otra persona la pidió o la cargó mientras tanto), para avisarle a quien los hizo.
 */
export async function enviarSolicitudesPendientes(
  supabase: SupabaseClient,
  userId: string,
): Promise<SolicitudSinEnviar[]> {
  if (!hayConexion()) return [];
  const todas = leerJson<SolicitudSinEnviar[]>(CLAVE_SIN_ENVIAR, []);
  const mias = todas.filter((s) => s.userId === userId);
  if (mias.length === 0) return [];

  const quedan = todas.filter((s) => s.userId !== userId);
  const repetidas: SolicitudSinEnviar[] = [];
  for (const pedido of mias) {
    const resultado = await enviar(supabase, pedido.nombre, pedido.artista, pedido.artistaId);
    if (resultado.tipo === "duplicado") repetidas.push(pedido);
    else if (resultado.tipo === "error") quedan.push(pedido);
  }
  guardarJson(CLAVE_SIN_ENVIAR, quedan);
  void refrescarSolicitudes(supabase);
  return repetidas;
}

/** Dueño: vincula la canción que cargó a mano (queda a nombre de quien pidió) o marca «no se pudo». */
export async function resolverSolicitud(
  supabase: SupabaseClient,
  solicitudId: number,
  cancionId: number | null,
): Promise<string | null> {
  const { error } = await supabase.rpc("resolver_solicitud", {
    p_id: solicitudId,
    p_cancion_id: cancionId,
  });
  if (error) return error.message;
  await refrescarSolicitudes(supabase);
  return null;
}
