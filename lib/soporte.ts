export const WHATSAPP_SOPORTE = "5493516155415";

export function linkWhatsappSoporte(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(mensaje)}`;
}
