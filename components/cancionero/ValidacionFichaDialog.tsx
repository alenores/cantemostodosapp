"use client";

type ValidacionFichaDialogProps = {
  open: boolean;
  nombre: string;
  avatarUrl: string | null;
  fecha: string | null;
  puedeQuitar: boolean;
  onCerrar: () => void;
  onQuitar: () => void;
};

function formatearFecha(valor: string | null): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export default function ValidacionFichaDialog({
  open,
  nombre,
  avatarUrl,
  fecha,
  puedeQuitar,
  onCerrar,
  onQuitar,
}: ValidacionFichaDialogProps) {
  if (!open) return null;

  const fechaTexto = formatearFecha(fecha);
  const inicial = (nombre.trim().charAt(0) || "?").toLocaleUpperCase("es");

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onCerrar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Validación de la canción"
        className="relative z-10 w-full max-w-sm rounded-[12px] border border-border bg-bg-card p-5"
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#57515b] text-lg font-semibold text-text-primary">
              {inicial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-primary">{nombre}</p>
            <p className="text-sm text-text-secondary">
              {fechaTexto ? `Validó esta canción el ${fechaTexto}` : "Validó esta canción"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-text-primary">
          El tilde azul significa que la letra y los acordes fueron revisados y están bien.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-primary"
          >
            Cerrar
          </button>
          {puedeQuitar ? (
            <button
              type="button"
              onClick={onQuitar}
              className="min-h-11 flex-1 rounded-[10px] bg-[#323232] text-sm font-semibold text-text-primary"
            >
              Quitar validación
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
