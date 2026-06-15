"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import UserAvatar from "@/components/perfil/UserAvatar";
import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { clearAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { createClient } from "@/lib/supabase/client";
import type { UsuarioActivo } from "@/types";
import { ArrowLeft, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const buttonClassName =
  "min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60";

const MIN_PASSWORD_LENGTH = 6;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getAvatarExtension(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

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
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAvatarPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!AVATAR_TYPES.has(file.type)) {
      setError("Usá una imagen JPG, PNG o WebP.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen no puede superar 2 MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setError(null);

    const supabase = createClient();
    await clearAppSnapshot();
    await supabase.auth.signOut();

    startNavigation();
    router.replace("/auth/login");
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

    const quiereCambiarContraseña = nuevaContraseña.length > 0;

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
      const extension = getAvatarExtension(avatarFile.type);
      const path = `${usuarioInicial.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        setLoading(false);
        setError(
          uploadError.message.includes("Bucket not found")
            ? "Falta configurar el bucket de avatares en Supabase. Ejecutá supabase/avatars.sql."
            : uploadError.message,
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

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAvatarUrl(nextAvatarUrl);
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }

    router.refresh();
    const aviso = emailCambiado ? "email-pendiente" : "perfil-actualizado";
    startNavigation();
    router.push(`/salas?aviso=${aviso}`);
  }

  const previewUrl = avatarPreview ?? avatarUrl;
  const tieneNombreGuardado = Boolean(usuarioInicial.nombre.trim());

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <div className="flex items-center gap-2">
          <TapLink
            href="/salas"
            ariaLabel="Volver a salas"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-bg-darker"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </TapLink>
          <h1 className="text-lg font-extrabold tracking-tight text-bg-darker">
            Mi perfil
          </h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        {!tieneNombreGuardado && (
          <p className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary">
            Tu cuenta no tiene nombre guardado todavía. Completalo acá abajo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={nombre.trim() || "Avatar"}
                  className="size-24 rounded-full object-cover"
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
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarPick}
            />
            <p className="text-center text-xs text-text-muted">
              JPG, PNG o WebP · máx. 2 MB
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="perfil-nombre" className="text-sm text-text-secondary">
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
            <label htmlFor="perfil-email" className="text-sm text-text-secondary">
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
              Si lo cambiás, Supabase envía un email de confirmación. Hasta
              confirmarlo seguís entrando con el email actual.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-bg-card/50 p-4">
            <p className="text-sm font-semibold text-text-primary">
              Cambiar contraseña
            </p>
            <p className="text-xs text-text-muted">
              Dejá estos campos vacíos si no querés cambiarla. Supabase puede
              pedir tu contraseña actual por seguridad.
            </p>
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
                placeholder="Solo si querés cambiarla"
                value={contraseñaActual}
                onChange={(event) => setContraseñaActual(event.target.value)}
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
                onChange={(event) => setNuevaContraseña(event.target.value)}
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
                onChange={(event) => setConfirmarContraseña(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={buttonClassName}
            style={{ transitionTimingFunction: "var(--transition-timing)" }}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>

          {error && (
            <p className="text-center text-sm text-accent" role="alert">
              {error}
            </p>
          )}
        </form>

        <TapButton
          onClick={() => void handleLogout()}
          disabled={logoutLoading || loading}
          className="mt-6 min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base font-semibold text-text-primary disabled:opacity-60"
        >
          {logoutLoading ? "Cerrando sesión..." : "Cerrar sesión"}
        </TapButton>
      </main>
    </div>
  );
}
