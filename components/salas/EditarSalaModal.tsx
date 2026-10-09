"use client";

import SalaAvatar from "@/components/salas/SalaAvatar";
import { TapButton } from "@/components/ui/TapFeedback";
import { prepararFotoLiviana } from "@/lib/imagen-liviana";
import { uploadSalaAvatar, validateSalaAvatarFile } from "@/lib/sala-avatar";
import { createClient } from "@/lib/supabase/client";
import type { Sala } from "@/types";
import { Camera, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-estandar border border-border bg-bg-app px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors duration-150";

type SalaRef = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

type EditarSalaModalProps = {
  open: boolean;
  sala: SalaRef | null;
  esDueno: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditarSalaModal({
  open,
  sala,
  esDueno,
  onClose,
  onSaved,
}: EditarSalaModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sala) {
      return;
    }
    setNombre(sala.nombre);
    setDescripcion(sala.descripcion ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    setPreparandoFoto(false);
  }, [open, sala]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!open || !sala) {
    return null;
  }

  async function handleAvatarPick(file: File | null) {
    if (!file) {
      return;
    }
    const validationError = validateSalaAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPreparandoFoto(true);
    setError(null);
    try {
      const liviana = await prepararFotoLiviana(file, "sala");
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(liviana);
      setAvatarPreview(URL.createObjectURL(liviana));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo usar esa foto.");
    } finally {
      setPreparandoFoto(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sala || preparandoFoto) {
      return;
    }

    const nombreLimpio = nombre.trim();
    if (esDueno && !nombreLimpio) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const cambios: { nombre?: string; descripcion: string | null } = {
      descripcion: descripcion.trim() || null,
    };
    if (esDueno) {
      cambios.nombre = nombreLimpio;
    }

    const { error: updateError } = await supabase
      .from("salas")
      .update(cambios)
      .eq("id", sala.id);

    if (updateError) {
      setLoading(false);
      setError("No se pudo guardar.");
      return;
    }

    if (avatarFile) {
      try {
        await uploadSalaAvatar(sala.id, avatarFile);
      } catch (err) {
        setLoading(false);
        setError(
          err instanceof Error ? err.message : "No se pudo guardar la foto.",
        );
        onSaved();
        return;
      }
    }

    setLoading(false);
    onSaved();
    onClose();
  }

  function handleClose() {
    if (loading || preparandoFoto) {
      return;
    }
    onClose();
  }

  const foto = avatarPreview ?? sala.avatar_url;

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
        aria-labelledby="editar-sala-titulo"
        className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
              Sala
            </p>
            <h2
              id="editar-sala-titulo"
              className="mt-1 truncate text-lg font-extrabold text-text-primary"
            >
              {esDueno ? "Editar sala" : sala.nombre}
            </h2>
          </div>
          <TapButton
            aria-label="Cerrar"
            onClick={handleClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <SalaAvatar
                nombre={nombre || sala.nombre}
                avatarUrl={foto}
                sizeClassName="size-20"
                iconClassName="size-8"
                roundedClassName="rounded-2xl"
              />
              <TapButton
                type="button"
                aria-label="Cambiar foto de la sala"
                disabled={loading || preparandoFoto}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary shadow disabled:opacity-60"
              >
                <Camera className="size-4" aria-hidden="true" />
              </TapButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleAvatarPick(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>
            {preparandoFoto ? (
              <p className="text-xs text-text-muted">Preparando la foto…</p>
            ) : null}
          </div>

          {esDueno ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-text-secondary">Nombre</span>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className={inputClassName}
                maxLength={80}
                required
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text-secondary">Descripción</span>
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className={`${inputClassName} min-h-24 py-3`}
              maxLength={280}
            />
          </label>

          {error ? (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          ) : null}

          <TapButton
            type="submit"
            disabled={loading || preparandoFoto}
            className="min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Guardar"}
          </TapButton>
        </form>
      </div>
    </div>
  );
}
