export const PERFIL_AVISO_MENSAJES: Record<string, string> = {
  "perfil-actualizado": "Perfil actualizado.",
  "email-pendiente":
    "Te enviamos un email para confirmar el cambio. Hasta entonces seguís entrando con el email actual.",
  "sin-acceso-sala":
    "No pertenecés a esa sala. Pedile al creador el QR o que te sume por email.",
};

export function getPerfilAvisoMensaje(aviso: string | null | undefined): string | null {
  if (!aviso) {
    return null;
  }

  return PERFIL_AVISO_MENSAJES[aviso] ?? null;
}
