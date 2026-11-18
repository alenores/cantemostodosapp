import type { CifradoEditorWebImportData } from "@/components/cifrado/CifradoEditorIngresoWebSearch";

const CANCIONERO_WEB_ALTA_KEY = "cancionero-web-alta";

export function guardarWebAltaPendiente(data: CifradoEditorWebImportData) {
  sessionStorage.setItem(CANCIONERO_WEB_ALTA_KEY, JSON.stringify(data));
}

export function tomarWebAltaPendiente(): CifradoEditorWebImportData | null {
  const raw = sessionStorage.getItem(CANCIONERO_WEB_ALTA_KEY);
  sessionStorage.removeItem(CANCIONERO_WEB_ALTA_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CifradoEditorWebImportData;
  } catch {
    return null;
  }
}
