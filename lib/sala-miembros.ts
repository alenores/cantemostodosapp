import { createClient } from "@/lib/supabase/client";
import type { SalaMiembro } from "@/types";

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

export async function agregarMiembroPorEmail(
  salaId: number,
  email: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("agregar_miembro_por_email", {
    p_sala_id: salaId,
    p_email: email,
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
