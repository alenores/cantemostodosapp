"use client";

import { FilaPersonaSala, SumarPersona } from "@/components/salas/PersonaDeSala";
import {
  eliminarMiembroSala,
  inviteUrlFromToken,
  obtenerInviteToken,
  rotarInviteToken,
} from "@/lib/sala-miembros";
import { TapButton } from "@/components/ui/TapFeedback";
import type { SalaMiembro } from "@/types";
import { Loader2, RefreshCw, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

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

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {isOwner ? (
            <TapButton
              type="button"
              disabled={busy}
              onClick={() => void handleRotar()}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-bg-app text-sm text-text-primary disabled:opacity-60"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Generar código nuevo
            </TapButton>
          ) : null}

          <SumarPersona salaId={salaId} onSumada={onMiembrosChange} />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold text-text-primary">Miembros</p>
          <ul>
            {miembros.map((m) => (
              <FilaPersonaSala
                key={m.user_id}
                miembro={m}
                esVos={m.user_id === userId}
                puedeSacar={isOwner && m.user_id !== userId}
                disabled={busy}
                onSacar={(id) => void handleEliminar(id)}
              />
            ))}
          </ul>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
