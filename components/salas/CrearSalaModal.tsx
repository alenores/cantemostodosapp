"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg-app px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

type CrearSalaModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CrearSalaModal({
  open,
  onClose,
  onCreated,
}: CrearSalaModalProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tenés que iniciar sesión para crear una sala.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("salas").insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      visible: true,
      creado_por: user.id,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNombre("");
    setDescripcion("");
    onCreated();
    onClose();
  }

  function handleClose() {
    if (loading) {
      return;
    }

    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-sala-titulo"
        className="relative z-10 w-full max-w-md rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
              Nueva sala
            </p>
            <h2
              id="crear-sala-titulo"
              className="mt-1 text-lg font-extrabold text-text-primary"
            >
              Crear sala
            </h2>
          </div>
          <TapButton
            aria-label="Cerrar"
            onClick={handleClose}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label
              htmlFor="sala-nombre"
              className="mb-1.5 block text-xs font-medium text-text-muted"
            >
              Nombre
            </label>
            <input
              id="sala-nombre"
              type="text"
              required
              maxLength={80}
              placeholder="Ej: Los del viernes"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="sala-descripcion"
              className="mb-1.5 block text-xs font-medium text-text-muted"
            >
              Descripción (opcional)
            </label>
            <textarea
              id="sala-descripcion"
              rows={3}
              maxLength={200}
              placeholder="Una frase sobre esta sala..."
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className={`${inputClassName} min-h-[88px] resize-none py-3`}
            />
          </div>

          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}

          <TapButton
            type="submit"
            disabled={loading || !nombre.trim()}
            className="min-h-11 w-full rounded-[10px] bg-accent text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear sala"}
          </TapButton>
        </form>
      </div>
    </div>
  );
}
