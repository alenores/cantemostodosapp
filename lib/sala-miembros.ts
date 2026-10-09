import { createClient } from "@/lib/supabase/client";
import type { Sala, SalaMiembro } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SalaListado = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

/** Solo las salas en las que esta persona figura como integrante. */
export async function fetchSalasDelUsuario(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ salas: SalaListado[]; error: string | null }> {
  const { data: filas, error: miembrosError } = await supabase
    .from("sala_miembros")
    .select("sala_id")
    .eq("user_id", userId);

  if (miembrosError) {
    return { salas: [], error: miembrosError.message };
  }

  const ids = (filas ?? [])
    .map((fila) => fila.sala_id)
    .filter((id): id is number => typeof id === "number");

  if (ids.length === 0) {
    return { salas: [], error: null };
  }

  const { data: salas, error: salasError } = await supabase
    .from("salas")
    .select("id, nombre, descripcion, avatar_url")
    .in("id", ids)
    .order("nombre");

  if (salasError) {
    return { salas: [], error: salasError.message };
  }

  return {
    salas: (salas ?? []) as SalaListado[],
    error: null,
  };
}

export async function usuarioEstaEnSala(
  supabase: SupabaseClient,
  salaId: number,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sala_miembros")
    .select("user_id")
    .eq("sala_id", salaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

type MiembroRow = {
  sala_id: number;
  user_id: string;
  rol: "owner" | "member";
  nombre: string;
  avatar_url: string | null;
};

export function mapMiembroRow(row: MiembroRow): SalaMiembro {
  return {
    sala_id: row.sala_id,
    user_id: row.user_id,
    rol: row.rol,
    nombre: row.nombre,
    avatar_url: row.avatar_url,
  };
}

export async function fetchMiembrosSalas(
  salaIds: number[],
): Promise<Record<number, SalaMiembro[]>> {
  if (salaIds.length === 0) {
    return {};
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("listar_miembros_salas", {
    p_sala_ids: salaIds,
  });

  if (error) {
    throw error;
  }

  const bySala: Record<number, SalaMiembro[]> = {};
  for (const row of (data ?? []) as MiembroRow[]) {
    const miembro = mapMiembroRow(row);
    if (!bySala[miembro.sala_id]) {
      bySala[miembro.sala_id] = [];
    }
    bySala[miembro.sala_id].push(miembro);
  }
  return bySala;
}

export async function unirseASalaPorToken(token: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("unirse_a_sala_por_token", {
    p_token: token,
  });

  if (error) {
    throw error;
  }

  return data as number;
}

export async function obtenerInviteToken(salaId: number): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("obtener_invite_token_sala", {
    p_sala_id: salaId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function rotarInviteToken(salaId: number): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rotar_invite_token_sala", {
    p_sala_id: salaId,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export type PersonaBuscada = {
  user_id: string;
  nombre: string;
  avatar_url: string | null;
  ya_esta: boolean;
};

export async function buscarPersonasParaSala(
  salaId: number,
  nombre: string,
): Promise<PersonaBuscada[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buscar_personas_para_sala", {
    p_sala_id: salaId,
    p_nombre: nombre,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PersonaBuscada[]).map((persona) => ({
    user_id: persona.user_id,
    nombre: persona.nombre,
    avatar_url: persona.avatar_url,
    ya_esta: Boolean(persona.ya_esta),
  }));
}

export async function agregarPersonaASala(
  salaId: number,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("agregar_persona_a_sala", {
    p_sala_id: salaId,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

export async function eliminarMiembroSala(
  salaId: number,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("eliminar_miembro_sala", {
    p_sala_id: salaId,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

export async function salirDeSala(salaId: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("salir_de_sala", {
    p_sala_id: salaId,
  });

  if (error) {
    throw error;
  }
}

export function inviteUrlFromToken(token: string): string {
  if (typeof window === "undefined") {
    return `/salas/unirse?token=${token}`;
  }
  return `${window.location.origin}/salas/unirse?token=${token}`;
}
