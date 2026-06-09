"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  getDuplicadoCancioneroNivel,
  insertCancionCancionero,
  updateCancionCancionero,
  type CancioneroFormData,
} from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const labelClassName =
  "mb-1.5 block text-sm font-medium text-text-secondary";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#3a3a3a] px-4 text-base text-text-secondary placeholder:italic placeholder:text-text-muted outline-none focus:border-accent focus:text-text-primary";

const textareaClassName =
  "min-h-[200px] w-full resize-y rounded-[10px] border border-border bg-letra-bg px-4 py-3 text-base text-letra-text placeholder:italic placeholder:text-gray-500 outline-none focus:border-accent";

type CancioneroFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cancion?: CancionCancionero | null;
  cancionesExistentes?: CancionCancionero[];
  initialValues?: CancioneroFormData | null;
  onSubmit?: (form: CancioneroFormData) => Promise<void>;
  title?: string;
  submitLabel?: string;
};

function toFormState(cancion?: CancionCancionero | null) {
  return {
    nombre: cancion?.nombre ?? "",
    artista: cancion?.artista ?? "",
    letra: cancion?.letra ?? "",
  };
}

export default function CancioneroFormModal({
  open,
  onClose,
  onSaved,
  cancion = null,
  cancionesExistentes = [],
  initialValues = null,
  onSubmit,
  title,
  submitLabel,
}: CancioneroFormModalProps) {
  const isEditing = cancion !== null;
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [letra, setLetra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarDuplicadoAbierto, setConfirmarDuplicadoAbierto] =
    useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    nombre?: string;
    artista?: string;
    letra?: string;
  }>({});

  const isFormValid =
    nombre.trim().length > 0 &&
    artista.trim().length > 0 &&
    letra.trim().length > 0;

  const duplicadoNivel = useMemo(
    () =>
      getDuplicadoCancioneroNivel(
        cancionesExistentes,
        nombre,
        artista,
        isEditing ? cancion?.id : undefined,
      ),
    [cancionesExistentes, nombre, artista, isEditing, cancion?.id],
  );

  useEffect(() => {
    if (open) {
      const form = cancion
        ? toFormState(cancion)
        : {
            nombre: initialValues?.nombre ?? "",
            artista: initialValues?.artista ?? "",
            letra: initialValues?.letra ?? "",
          };
      setNombre(form.nombre);
      setArtista(form.artista);
      setLetra(form.letra);
      setError(null);
      setFieldErrors({});
      setLoading(false);
      setConfirmarDuplicadoAbierto(false);
    }
  }, [
    open,
    cancion,
    initialValues?.nombre,
    initialValues?.artista,
    initialValues?.letra,
  ]);

  useHardwareBack(open, () => {
    if (confirmarDuplicadoAbierto) {
      setConfirmarDuplicadoAbierto(false);
      return;
    }

    onClose();
  });

  function validateFields() {
    const errors: {
      nombre?: string;
      artista?: string;
      letra?: string;
    } = {};

    if (!nombre.trim()) {
      errors.nombre = "Completá el nombre de la canción.";
    }

    if (!artista.trim()) {
      errors.artista = "Completá el artista.";
    }

    if (!letra.trim()) {
      errors.letra = "Completá la letra y acordes.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function ejecutarGuardado() {
    setLoading(true);
    setError(null);

    const formData: CancioneroFormData = {
      nombre: nombre.trim(),
      artista: artista.trim(),
      letra: letra.trim(),
    };

    const supabase = createClient();

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else if (isEditing && cancion) {
        await updateCancionCancionero(supabase, cancion.id, formData);
      } else {
        await insertCancionCancionero(supabase, formData);
      }

      onSaved();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la canción",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateFields()) {
      return;
    }

    if (duplicadoNivel === "nombre-artista") {
      setConfirmarDuplicadoAbierto(true);
      return;
    }

    await ejecutarGuardado();
  }

  function handleClose() {
    if (loading) {
      return;
    }

    setError(null);
    setConfirmarDuplicadoAbierto(false);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-8 sm:items-center">
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute inset-0 bg-black/60"
          onClick={handleClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancionero-form-titulo"
          className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
                Cancionero
              </p>
              <h2
                id="cancionero-form-titulo"
                className="mt-1 text-lg font-extrabold text-text-primary"
              >
                {title ?? (isEditing ? "Editar canción" : "Nueva canción")}
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

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-4"
          >
            <div>
              <label htmlFor="cancionero-nombre" className={labelClassName}>
                Nombre
              </label>
              <input
                id="cancionero-nombre"
                type="text"
                required
                autoFocus
                maxLength={120}
                placeholder="Nombre de la canción"
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                  if (fieldErrors.nombre) {
                    setFieldErrors((current) => ({
                      ...current,
                      nombre: undefined,
                    }));
                  }
                }}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.nombre)}
              />
              {fieldErrors.nombre && (
                <p className="mt-1.5 text-xs text-accent" role="alert">
                  {fieldErrors.nombre}
                </p>
              )}
              {!fieldErrors.nombre && duplicadoNivel === "nombre" && (
                <p className="mt-1.5 text-xs text-[#e6c619]" role="status">
                  Ya existe una canción con este nombre en el cancionero.
                </p>
              )}
              {!fieldErrors.nombre && duplicadoNivel === "nombre-artista" && (
                <p
                  className="mt-1.5 text-sm font-bold leading-snug text-[#e05555]"
                  role="status"
                >
                  Ya existe una canción con este nombre y artista en el
                  cancionero.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="cancionero-artista" className={labelClassName}>
                Artista
              </label>
              <input
                id="cancionero-artista"
                type="text"
                required
                maxLength={120}
                placeholder="Artista o banda"
                value={artista}
                onChange={(event) => {
                  setArtista(event.target.value);
                  if (fieldErrors.artista) {
                    setFieldErrors((current) => ({
                      ...current,
                      artista: undefined,
                    }));
                  }
                }}
                className={inputClassName}
                aria-invalid={Boolean(fieldErrors.artista)}
              />
              {fieldErrors.artista && (
                <p className="mt-1.5 text-xs text-accent" role="alert">
                  {fieldErrors.artista}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="cancionero-letra" className={labelClassName}>
                Letra y acordes
              </label>
              <textarea
                id="cancionero-letra"
                rows={10}
                required
                placeholder="Pegá acá la letra limpia con acordes..."
                value={letra}
                onChange={(event) => {
                  setLetra(event.target.value);
                  if (fieldErrors.letra) {
                    setFieldErrors((current) => ({
                      ...current,
                      letra: undefined,
                    }));
                  }
                }}
                className={textareaClassName}
                aria-invalid={Boolean(fieldErrors.letra)}
              />
              {fieldErrors.letra && (
                <p className="mt-1.5 text-xs text-accent" role="alert">
                  {fieldErrors.letra}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-accent" role="alert">
                {error}
              </p>
            )}

            <TapButton
              type="submit"
              disabled={loading || !isFormValid}
              className="min-h-11 w-full rounded-[10px] bg-accent text-base font-semibold text-white disabled:opacity-60"
            >
              {loading
                ? "Guardando..."
                : (submitLabel ??
                  (isEditing ? "Guardar cambios" : "Guardar"))}
            </TapButton>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarDuplicadoAbierto}
        zIndex={70}
        message="Ya existe una canción con este nombre y artista en el cancionero. ¿Querés guardarla igual?"
        confirmLabel="Guardar igual"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmarDuplicadoAbierto(false)}
        onConfirm={() => {
          setConfirmarDuplicadoAbierto(false);
          void ejecutarGuardado();
        }}
      />
    </>
  );
}
