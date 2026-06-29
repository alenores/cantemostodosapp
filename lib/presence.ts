import type { PresenceUsuario } from "@/types";

export const PRESENCE_AVATAR_COLORS = [
  "#4A90D9",
  "#7B68EE",
  "#50C878",
  "#FF6B6B",
  "#FFB347",
  "#20B2AA",
] as const;

export function colorPorUsuario(userId: string) {
  const index = userId.charCodeAt(0) % PRESENCE_AVATAR_COLORS.length;
  return PRESENCE_AVATAR_COLORS[index];
}

export function parsePresenceState(
  state: Record<string, unknown[]>,
): PresenceUsuario[] {
  const seen = new Set<string>();
  const usuarios: PresenceUsuario[] = [];

  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      const presence = entry as Partial<PresenceUsuario>;

      if (
        typeof presence.user_id !== "string" ||
        typeof presence.nombre !== "string" ||
        seen.has(presence.user_id)
      ) {
        continue;
      }

      seen.add(presence.user_id);
      usuarios.push({
        user_id: presence.user_id,
        nombre: presence.nombre,
        avatar_url:
          typeof presence.avatar_url === "string" ? presence.avatar_url : null,
      });
    }
  }

  return usuarios;
}
