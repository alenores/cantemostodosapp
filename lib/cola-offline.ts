import { parseCancioneroUrlId } from "@/lib/cancionero-url";

export function cancionDisponibleOffline(
  item: { url_letra?: string | null; letra_texto?: string | null },
  descargadas: ReadonlySet<number>,
): boolean {
  const id = parseCancioneroUrlId(item.url_letra);
  if (id !== null) return descargadas.has(id);
  return Boolean(item.letra_texto?.trim());
}
