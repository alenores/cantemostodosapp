"use client";

import SalaAvatar from "@/components/salas/SalaAvatar";
import { TapButton } from "@/components/ui/TapFeedback";
import { uploadSalaAvatar, validateSalaAvatarFile } from "@/lib/sala-avatar";
import { createClient } from "@/lib/supabase/client";
import { Camera, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!open) {
    return null;
  }

  function resetForm() {
    setNombre("");
    setDescripcion("");
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setError(null);
  }

  function handleAvatarPick(file: File | null) {
    if (!file) {
      return;
    }
    const validationError = validateSalaAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
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

    const { data: salaCreada, error: insertError } = await supabase
      .from("salas")
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        visible: true,
        creado_por: user.id,
      })
      .select("id")
      .single();

    if (insertError || !salaCreada) {
      setLoading(false);
      setError(insertError?.message ?? "No se pudo crear la sala.");
      return;
    }

    if (avatarFile) {
      try {
        await uploadSalaAvatar(salaCreada.id, avatarFile);
      } catch (err) {
        setLoading(false);
        setError(
          err instanceof Error
            ? `${err.message} La sala se creó igual; podés subir la foto después.`
            : "La sala se creó, pero no se pudo subir la foto.",
        );
        onCreated();
        return;
      }
    }

    setLoading(false);
    resetForm();
    onCreated();
    onClose();
  }

  function handleClose() {
    if (loading) {
      return;
    }

    resetForm();
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
        className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
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
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <SalaAvatar
                nombre={nombre || "Sala"}
                avatarUrl={avatarPreview}
                sizeClassName="size-20"
                iconClassName="size-8"
                roundedClassName="rounded-2xl"
              />
              <TapButton
                type="button"
                aria-label="Elegir foto de la sala"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary shadow"
              >
                <Camera className="size-4" aria-hidden="true" />
              </TapButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  handleAvatarPick(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>
            <p className="text-center text-[11px] text-text-faint">
              Foto opcional · JPG, PNG o WebP · máx. 2 MB
            </p>
          </div>

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
