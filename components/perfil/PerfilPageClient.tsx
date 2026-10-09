"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import UserAvatar from "@/components/perfil/UserAvatar";
import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { prepararFotoLiviana } from "@/lib/imagen-liviana";
import { createClient } from "@/lib/supabase/client";
import type { UsuarioActivo } from "@/types";
import { ArrowLeft, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-estandar border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors duration-150";

const buttonClassName =
  "min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60";

const MIN_PASSWORD_LENGTH = 6;

type PerfilPageClientProps = {
  usuarioInicial: UsuarioActivo;
};

export default function PerfilPageClient({
  usuarioInicial,
}: PerfilPageClientProps) {
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(usuarioInicial.nombre);
  const [email, setEmail] = useState(usuarioInicial.email);
  const [contraseñaActual, setContraseñaActual] = useState("");
  const [nuevaContraseña, setNuevaContraseña] = useState("");
  const [confirmarContraseña, setConfirmarContraseña] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(usuarioInicial.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambiarContraseñaAbierto, setCambiarContraseñaAbierto] = useState(false);

  function cerrarCambioContraseña() {
    setCambiarContraseñaAbierto(false);
    setContraseñaActual("");
    setNuevaContraseña("");
    setConfirmarContraseña("");
  }

  async function handleAvatarPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Elegí una foto.");
      return;
    }

    setPreparandoFoto(true);
    setError(null);
    try {
      const liviana = await prepararFotoLiviana(file, "perfil");
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

    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNombre) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!trimmedEmail) {
      setError("El email es obligatorio.");
      return;
    }

    const quiereCambiarContraseña =
      cambiarContraseñaAbierto && nuevaContraseña.length > 0;

    if (quiereCambiarContraseña) {
      if (!contraseñaActual) {
        setError("Ingresá tu contraseña actual para cambiarla.");
        return;
      }

      if (nuevaContraseña.length < MIN_PASSWORD_LENGTH) {
        setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        return;
      }

      if (nuevaContraseña !== confirmarContraseña) {
        setError("Las contraseñas nuevas no coinciden.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    let nextAvatarUrl = avatarUrl;

    if (avatarFile) {
      const path = `${usuarioInicial.id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: "image/webp" });

      if (uploadError) {
        setLoading(false);
        setError(
          uploadError.message.includes("Bucket not found")
            ? "Todavía no se pueden guardar fotos de perfil."
            : "No se pudo guardar la foto.",
        );
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      nextAvatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    const emailCambiado = trimmedEmail !== usuarioInicial.email;
    const updatePayload: {
      email?: string;
      password?: string;
      currentPassword?: string;
      data: { nombre: string; avatar_url: string | null };
    } = {
      data: {
        nombre: trimmedNombre,
        avatar_url: nextAvatarUrl,
      },
    };

    if (emailCambiado) {
      updatePayload.email = trimmedEmail;
    }

    if (quiereCambiarContraseña) {
      updatePayload.password = nuevaContraseña;
      updatePayload.currentPassword = contraseñaActual;
    }

    const { error: updateError } = await supabase.auth.updateUser(updatePayload);

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    if (trimmedNombre !== usuarioInicial.nombre || nextAvatarUrl !== usuarioInicial.avatar_url) {
      await supabase.from("canciones_guardadas")
        .update({ agregado_nombre: trimmedNombre, agregado_avatar_url: nextAvatarUrl })
        .eq("user_id", usuarioInicial.id)
        .is("sala_id", null);
    }
    setLoading(false);

    setAvatarUrl(nextAvatarUrl);
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }

    router.refresh();
    const aviso = emailCambiado ? "email-pendiente" : "perfil-actualizado";
    startNavigation();
    router.push(`/perfil?aviso=${aviso}`);
  }

  const previewUrl = avatarPreview ?? avatarUrl;
  const tieneNombreGuardado = Boolean(usuarioInicial.nombre.trim());

  const avatarBlock = (
    <>
      <div className="relative">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={nombre.trim() || "Avatar"}
            className="size-24 rounded-full object-cover lg:size-28"
          />
        ) : (
          <UserAvatar
            nombre={nombre}
            email={email}
            avatarUrl={null}
            size={96}
            className="text-2xl"
          />
        )}
        <TapButton
          type="button"
          aria-label="Cambiar foto de perfil"
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border border-border bg-bg-card text-text-primary"
        >
          <Camera className="size-4" aria-hidden="true" />
        </TapButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void handleAvatarPick(event);
        }}
      />
      <p className="text-center text-xs text-text-muted lg:text-left">
        {preparandoFoto ? "Preparando la foto…" : "Se guarda liviana, sola."}
      </p>
    </>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />
      {/* Mobile-only integrated header */}
      <header
        className="shrink-0 bg-transparent px-4 pb-2 lg:hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="app-page-container flex items-center gap-3">
          <TapLink
            href="/perfil"
            ariaLabel="Volver a mi perfil"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card border border-border/40 shadow-sm"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            Editar perfil
          </h1>
        </div>
      </header>

      <main className="app-page-main flex flex-1 flex-col gap-6 px-4 py-4 pb-24 lg:gap-5 lg:px-8 lg:py-8 lg:pb-8">
        <div className="app-page-container flex w-full flex-col gap-6 lg:gap-5">
          <div className="hidden items-center justify-between gap-4 lg:flex">
            <div className="flex min-w-0 items-center gap-3">
              <TapLink
                href="/perfil"
                ariaLabel="Volver a mi perfil"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/40 bg-bg-card shadow-sm"
              >
                <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
              </TapLink>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
                Editar perfil
              </h1>
            </div>
          </div>

          {!tieneNombreGuardado && (
            <p className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary">
              Tu cuenta no tiene nombre guardado todavía. Completalo acá abajo.
            </p>
          )}

          <form
            id="perfil-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 lg:gap-4"
          >
            <div className="flex max-w-xl flex-col gap-5">
              <div className="flex flex-col items-center gap-3 lg:items-start">
                {avatarBlock}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="perfil-nombre"
                  className="text-sm text-text-secondary"
                >
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className={inputClassName}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="perfil-email"
                  className="text-sm text-text-secondary"
                >
                  Email
                </label>
                <input
                  id="perfil-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                />
                <p className="text-xs text-text-muted">
                  Si lo cambiás, llega un email de confirmación. Hasta
                  confirmarlo seguís entrando con el email actual.
                </p>
              </div>

              {cambiarContraseñaAbierto ? (
                <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-bg-card/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">
                      Cambiar contraseña
                    </p>
                    <TapButton
                      type="button"
                      onClick={cerrarCambioContraseña}
                      className="text-sm text-text-muted"
                    >
                      Cancelar
                    </TapButton>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="perfil-password-actual"
                      className="text-sm text-text-secondary"
                    >
                      Contraseña actual
                    </label>
                    <input
                      id="perfil-password-actual"
                      type="password"
                      autoComplete="current-password"
                      value={contraseñaActual}
                      onChange={(event) =>
                        setContraseñaActual(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="perfil-password-nueva"
                      className="text-sm text-text-secondary"
                    >
                      Nueva contraseña
                    </label>
                    <input
                      id="perfil-password-nueva"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaContraseña}
                      onChange={(event) =>
                        setNuevaContraseña(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="perfil-password-confirmar"
                      className="text-sm text-text-secondary"
                    >
                      Confirmar nueva contraseña
                    </label>
                    <input
                      id="perfil-password-confirmar"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repetí la nueva contraseña"
                      value={confirmarContraseña}
                      onChange={(event) =>
                        setConfirmarContraseña(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
              ) : (
                <TapButton
                  type="button"
                  onClick={() => setCambiarContraseñaAbierto(true)}
                  className="min-h-10 w-fit rounded-[10px] border border-border bg-bg-card px-4 text-sm font-medium text-text-primary"
                >
                  Cambiar contraseña
                </TapButton>
              )}
            </div>

            <div className="hidden lg:flex lg:justify-end">
              <button
                type="submit"
                disabled={loading || preparandoFoto}
                className="min-h-10 rounded-[10px] bg-accent px-6 text-sm font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60"
                style={{ transitionTimingFunction: "var(--transition-timing)" }}
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || preparandoFoto}
              className={`${buttonClassName} lg:hidden`}
              style={{ transitionTimingFunction: "var(--transition-timing)" }}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>

            {error && (
              <p
                className="text-center text-sm text-accent lg:text-left"
                role="alert"
              >
                {error}
              </p>
            )}
          </form>

        </div>
      </main>
    </div>
  );
}
