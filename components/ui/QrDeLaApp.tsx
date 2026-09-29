"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { useState } from "react";

/**
 * Ícono de QR del encabezado: abre un código que lleva a la app.
 * La dirección es la de donde se está usando la app.
 */
export default function QrDeLaApp() {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useHardwareBack(open, () => setOpen(false));

  async function abrir() {
    setError(null);
    setOpen(true);
    try {
      setQrDataUrl(
        await QRCode.toDataURL(window.location.origin, {
          width: 240,
          margin: 2,
          color: { dark: "#111111", light: "#ffffff" },
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo armar el código QR: ${err.message}`
          : "No se pudo armar el código QR. Cerrá y volvé a intentar.",
      );
    }
  }

  return (
    <>
      <TapButton
        type="button"
        aria-label="Ver código QR de la app"
        onClick={() => void abrir()}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-bg-darker"
      >
        <QrCode className="size-5" aria-hidden="true" />
      </TapButton>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-app-titulo"
            className="relative z-10 w-full max-w-sm rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="qr-app-titulo"
                className="text-lg font-extrabold text-text-primary"
              >
                CantemosTodosApp
              </h2>
              <TapButton
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
              >
                <X className="size-5" aria-hidden="true" />
              </TapButton>
            </div>
            <div className="flex flex-col items-center gap-3">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Código QR para abrir CantemosTodosApp"
                  className="size-60 rounded-[12px] bg-white p-2"
                />
              ) : null}
              {error ? (
                <p className="text-sm text-accent" role="alert">
                  {error}
                </p>
              ) : (
                <p className="text-center text-xs text-text-muted">
                  Escaneá este código con la cámara del celular y se abre la
                  app.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
