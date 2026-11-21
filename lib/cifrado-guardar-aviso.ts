import { formatDatabaseError } from "@/lib/supabase/errors";

export function mensajeDatosFaltantesGuardar(faltantes: string[]): string {
  const lista = faltantes.map((item) => `• ${item}`).join("\n");
  const titulo =
    faltantes.length === 1
      ? "Falta completar este dato para guardar:"
      : "Faltan completar estos datos para guardar:";

  const cierre =
    faltantes.length === 1
      ? "Completalo y volvé a apretar Guardar."
      : "Completalos y volvé a apretar Guardar.";

  return `${titulo}\n\n${lista}\n\n${cierre}`;
}

export function mensajeErrorAlGuardar(error: unknown): string {
  const detalle = formatDatabaseError(error, "").trim();

  if (!detalle) {
    return "No se pudo guardar la canción. No llegó el motivo. Volvé a intentarlo y, si sigue igual, avisale a quien administra la app.";
  }

  if (
    detalle.startsWith("No se pudo guardar") ||
    detalle.startsWith("Completá") ||
    detalle.startsWith("Revisá") ||
    detalle.startsWith("Iniciá") ||
    detalle.startsWith("La letra") ||
    detalle.startsWith("El link") ||
    detalle.startsWith("Aplicá") ||
    detalle.startsWith("Falta") ||
    detalle.startsWith("Para guardar")
  ) {
    return detalle;
  }

  return `No se pudo guardar la canción.\n\nSi se lo contás a quien administra la app, pasale este texto:\n\n${detalle}`;
}
