"use client";

import SalaAvatar from "@/components/salas/SalaAvatar";
import { TapButton } from "@/components/ui/TapFeedback";
import { colorPorUsuario } from "@/lib/presence";
import { uploadSalaAvatar, validateSalaAvatarFile } from "@/lib/sala-avatar";
import {
  agregarMiembroPorEmail,
  eliminarMiembroSala,
  salirDeSala,
} from "@/lib/sala-miembros";
import type { Sala, SalaMiembro } from "@/types";
import { Camera, LogOut, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type SalaRef = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

type SalaMiembrosDetalleModalProps = {
  open: boolean;
  sala: SalaRef | null;
  miembros: SalaMiembro[];
  currentUserId: string;
  onClose: () => void;
  onChanged: () => void;
};

export default function SalaMiembrosDetalleModal({
  open,
  sala,
  miembros,
  currentUserId,
  onClose,
  onChanged,
}: SalaMiembrosDetalleModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [confirmSalir, setConfirmSalir] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setLocalAvatarUrl(sala?.avatar_url ?? null);
  }, [sala?.id, sala?.avatar_url, open]);

  const isOwner = miembros.some(
    (m) => m.user_id === currentUserId && m.rol === "owner",
  );
  const isMemberOnly = miembros.some(
    (m) => m.user_id === currentUserId && m.rol === "member",
  );

  if (!open || !sala) {
    return null;
  }

  const displayAvatarUrl = localAvatarUrl ?? sala.avatar_url;

  async function handleAgregarEmail(event: FormEvent) {
    event.preventDefault();
    if (!sala || !email.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await agregarMiembroPorEmail(sala.id, email.trim());
      setEmail("");
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo sumar a esa persona",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminar(userId: string) {
    if (!sala) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await eliminarMiembroSala(sala.id, userId);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar al miembro",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSalir() {
    if (!sala) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await salirDeSala(sala.id);
      setConfirmSalir(false);
      onChanged();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo salir de la sala",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarFile(file: File | null) {
    if (!sala || !file) {
      return;
    }
    const validationError = validateSalaAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = await uploadSalaAvatar(sala.id, file);
      setLocalAvatarUrl(url);
      onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir la foto",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (busy) {
      return;
    }
    setConfirmSalir(false);
    setError(null);
    setEmail("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sala-miembros-titulo"
        className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[16px] border border-border bg-bg-card p-5 shadow-xl sm:max-h-[90dvh] sm:rounded-[16px]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative shrink-0">
              <SalaAvatar
                nombre={sala.nombre}
                avatarUrl={displayAvatarUrl}
                sizeClassName="size-14"
                iconClassName="size-6"
                roundedClassName="rounded-2xl"
              />
              {isOwner ? (
                <>
                  <TapButton
                    type="button"
                    aria-label="Cambiar foto de la sala"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary shadow disabled:opacity-60"
                  >
                    <Camera className="size-3.5" aria-hidden="true" />
                  </TapButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      void handleAvatarFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
                Participantes
              </p>
              <h2
                id="sala-miembros-titulo"
                className="mt-1 truncate text-lg font-extrabold text-text-primary"
              >
                {sala.nombre}
              </h2>
              {sala.descripcion ? (
                <p className="mt-0.5 truncate text-sm text-text-muted">
                  {sala.descripcion}
                </p>
              ) : null}
            </div>
          </div>
          <TapButton
            aria-label="Cerrar"
            onClick={handleClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        </div>

        <ul className="space-y-2">
          {miembros.length === 0 ? (
            <li className="text-sm text-text-muted">Nadie en esta sala aún.</li>
          ) : (
            miembros.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-app px-3 py-2.5"
              >
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: colorPorUsuario(m.user_id) }}
                  >
                    {m.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  {m.nombre}
                  {m.user_id === currentUserId ? (
                    <span className="ml-1 text-[10px] text-text-faint">(vos)</span>
                  ) : null}
                  {m.rol === "owner" ? (
                    <span className="ml-1 text-[10px] text-text-faint">
                      (creador)
                    </span>
                  ) : null}
                </span>
                {isOwner && m.rol === "member" ? (
                  <TapButton
                    type="button"
                    aria-label={`Eliminar a ${m.nombre}`}
                    disabled={busy}
                    onClick={() => void handleEliminar(m.user_id)}
                    className="flex size-8 items-center justify-center rounded-full text-accent disabled:opacity-60"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </TapButton>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {isOwner ? (
          <form
            onSubmit={(event) => void handleAgregarEmail(event)}
            className="mt-4 space-y-2 border-t border-border pt-4"
          >
            <label
              htmlFor="detalle-invitar-email"
              className="block text-xs font-medium text-text-muted"
            >
              Sumar por email
            </label>
            <div className="flex gap-2">
              <input
                id="detalle-invitar-email"
                type="email"
                required
                placeholder="amigo@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-app px-3 text-sm text-text-primary outline-none focus:border-accent"
              />
              <TapButton
                type="submit"
                disabled={busy || !email.trim()}
                className="min-h-11 shrink-0 rounded-[10px] bg-accent px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Sumar
              </TapButton>
            </div>
          </form>
        ) : null}

        {isMemberOnly ? (
          <div className="mt-4 border-t border-border pt-4">
            {!confirmSalir ? (
              <TapButton
                type="button"
                disabled={busy}
                onClick={() => setConfirmSalir(true)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-bg-app text-sm text-text-primary disabled:opacity-60"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Salir de la sala
              </TapButton>
            ) : (
              <div className="space-y-3 rounded-[12px] border border-accent/40 bg-accent-dim p-3">
                <p className="text-sm text-text-primary">
                  ¿Salir de <strong>{sala.nombre}</strong>? Ya no vas a verla
                  hasta que te vuelvan a invitar.
                </p>
                <div className="flex gap-2">
                  <TapButton
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmSalir(false)}
                    className="min-h-10 flex-1 rounded-[10px] border border-border bg-bg-card text-sm text-text-primary disabled:opacity-60"
                  >
                    Cancelar
                  </TapButton>
                  <TapButton
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSalir()}
                    className="min-h-10 flex-1 rounded-[10px] bg-accent text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? "Saliendo..." : "Sí, salir"}
                  </TapButton>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {isOwner ? (
          <p className="mt-4 text-center text-[11px] text-text-faint">
            Sos el creador. Para invitar con QR, entrá a la sala.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
