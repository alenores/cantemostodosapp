"use client";

import {
  agregarMiembroPorEmail,
  eliminarMiembroSala,
  inviteUrlFromToken,
  obtenerInviteToken,
  rotarInviteToken,
} from "@/lib/sala-miembros";
import { TapButton } from "@/components/ui/TapFeedback";
import type { SalaMiembro } from "@/types";
import { Loader2, RefreshCw, Trash2, X } from "lucide-react";
import QRCode from "qrcode";
import { FormEvent, useEffect, useState } from "react";

type SalaInviteQrModalProps = {
  open: boolean;
  salaId: number;
  salaNombre: string;
  isOwner: boolean;
  userId: string;
  miembros: SalaMiembro[];
  onClose: () => void;
  onMiembrosChange: () => void;
};

export default function SalaInviteQrModal({
  open,
  salaId,
  salaNombre,
  isOwner,
  userId,
  miembros,
  onClose,
  onMiembrosChange,
}: SalaInviteQrModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadToken() {
      setLoading(true);
      setError(null);
      try {
        const inviteToken = await obtenerInviteToken(salaId);
        if (cancelled) {
          return;
        }
        setToken(inviteToken);
        const url = inviteUrlFromToken(inviteToken);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 240,
          margin: 2,
          color: { dark: "#111111", light: "#ffffff" },
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el QR",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadToken();

    return () => {
      cancelled = true;
    };
  }, [open, salaId]);

  if (!open) {
    return null;
  }

  async function handleRotar() {
    setBusy(true);
    setError(null);
    try {
      const nuevo = await rotarInviteToken(salaId);
      setToken(nuevo);
      const url = inviteUrlFromToken(nuevo);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: { dark: "#111111", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo rotar el código");
    } finally {
      setBusy(false);
    }
  }

  async function handleAgregarEmail(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await agregarMiembroPorEmail(salaId, email.trim());
      setEmail("");
      onMiembrosChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo sumar a esa persona",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminar(miembroUserId: string) {
    setBusy(true);
    setError(null);
    try {
      await eliminarMiembroSala(salaId, miembroUserId);
      onMiembrosChange();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar al miembro",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sala-invite-titulo"
        className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
              Invitación
            </p>
            <h2
              id="sala-invite-titulo"
              className="mt-1 text-lg font-extrabold text-text-primary"
            >
              {salaNombre}
            </h2>
          </div>
          <TapButton
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        </div>

        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <Loader2 className="size-8 animate-spin text-accent" />
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`Código QR para unirse a ${salaNombre}`}
              className="size-60 rounded-[12px] bg-white p-2"
            />
          ) : null}
          <p className="text-center text-xs text-text-muted">
            Escaneá este código para sumarte a la sala.
          </p>
          {token ? (
            <p className="break-all text-center text-[10px] text-text-faint">
              {inviteUrlFromToken(token)}
            </p>
          ) : null}
        </div>

        {isOwner ? (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <TapButton
              type="button"
              disabled={busy}
              onClick={() => void handleRotar()}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-bg-app text-sm text-text-primary disabled:opacity-60"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Generar código nuevo
            </TapButton>

            <form
              onSubmit={(event) => void handleAgregarEmail(event)}
              className="space-y-2"
            >
              <label
                htmlFor="invitar-email"
                className="block text-xs font-medium text-text-muted"
              >
                Sumar por email
              </label>
              <div className="flex gap-2">
                <input
                  id="invitar-email"
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

            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">
                Miembros
              </p>
              <ul className="space-y-2">
                {miembros.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-app px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {m.nombre}
                      {m.rol === "owner" ? (
                        <span className="ml-1 text-[10px] text-text-faint">
                          (creador)
                        </span>
                      ) : null}
                    </span>
                    {m.rol === "member" && m.user_id !== userId ? (
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
                ))}
              </ul>
            </div>
          </div>
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
