"use client";

import { useCancioneroSync } from "@/hooks/useCancioneroSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CancioneroNovedadesContext } from "./CancioneroNovedadesContext";

export default function CancioneroSyncRunner({ children }: { children: ReactNode }) {
  const {
    plan, checking, downloading, preparingOffline, ready, error, progress,
    check, download, dismissReady,
  } = useCancioneroSync();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const songs = plan?.songs ?? [];
  useBodyScrollLock(open);
  useHardwareBack(open && !downloading, () => setOpen(false));

  useEffect(() => {
    if (ready) setOpen(true);
  }, [ready]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open) dialog?.showModal();
    else dialog?.close();
  }, [open]);

  async function confirmDownload() {
    await download();
  }

  function closeDialog() {
    if (downloading) return;
    dismissReady();
    setOpen(false);
  }

  return (
    <CancioneroNovedadesContext.Provider value={{
      count: songs.length,
      hasNotice: songs.length > 0 || Boolean(error),
      open: () => { setOpen(true); void check(); },
    }}>
      {children}
      <dialog ref={dialogRef} onCancel={(event) => {
        if (downloading) event.preventDefault();
        else closeDialog();
      }} onClose={() => {
        if (!downloading) {
          dismissReady();
          setOpen(false);
        }
      }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
        }}
        aria-labelledby="cancionero-updates-title"
        aria-describedby="cancionero-updates-description"
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-xl border border-border bg-bg-card p-0 text-text-primary backdrop:bg-black/60">
        <div className="flex max-h-[85dvh] flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="cancionero-updates-title" className="text-lg font-semibold">Novedades del Cancionero</h2>
            <button type="button" aria-label="Cerrar novedades" onClick={closeDialog} disabled={downloading}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-app disabled:opacity-40">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p id="cancionero-updates-description" className="mt-2 text-sm text-text-muted">
            {ready
              ? "Las canciones y las pantallas para usar sin conexión ya quedaron preparadas."
              : "Al aceptar se descargan todas las canciones nuevas y actualizadas de esta lista. Las que no cambiaron quedan en tu celular."}
          </p>
          <ul className="my-4 min-h-0 flex-1 overflow-y-auto divide-y divide-border">
            {songs.map((song) => (
              <li key={song.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{song.nombre}</p>
                  {song.artista ? <p className="text-xs text-text-muted">{song.artista}</p> : null}
                </div>
                <span className="shrink-0 rounded bg-accent/15 px-2 py-1 text-xs text-accent">
                  {song.kind === "new" ? "Nueva" : "Actualizada"}
                </span>
              </li>
            ))}
          </ul>
          {error ? <p className="mb-3 text-sm text-accent" role="alert">{error}</p> : null}
          {error && songs.length > 0 ? (
            <button type="button" onClick={() => void check()} disabled={!online || checking || downloading}
              className="mb-3 min-h-11 text-sm text-accent underline disabled:opacity-50">
              {checking ? "Comprobando…" : "Actualizar listado"}
            </button>
          ) : null}
          {!online ? <p className="mb-3 text-sm text-text-muted">Conectate para descargar. Tu copia anterior sigue disponible.</p> : null}
          {downloading ? (
            <p className="mb-3 text-sm" role="status">
              {preparingOffline
                ? "Preparando las pantallas para usar sin conexión…"
                : `Descargando ${progress.completed} de ${progress.total}…`}
            </p>
          ) : null}
          {ready ? (
            <p className="mb-3 text-sm font-semibold text-accent" role="status">
              Todo listo. Ya podés usar la aplicación sin conexión.
            </p>
          ) : null}
          {!ready && !songs.length && !error ? (
            <p className="mb-3 text-sm" role="status">{checking ? "Comprobando novedades…" : "Tu Cancionero está al día."}</p>
          ) : null}
          <div className="flex shrink-0 gap-3">
            {!ready ? <button type="button" onClick={closeDialog} disabled={downloading}
              className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-50">
              {downloading ? "Preparando…" : "Más tarde"}
            </button> : null}
            {ready ? (
              <button type="button" onClick={closeDialog}
                className="min-h-11 flex-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
                Entendido
              </button>
            ) : songs.length > 0 ? (
              <button type="button" onClick={() => void confirmDownload()}
                disabled={!online || downloading || checking}
                className="min-h-11 flex-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50">
                {downloading ? "Descargando…" : "Descargar todo"}
              </button>
            ) : error ? (
              <button type="button" onClick={() => void check()} disabled={!online || checking}
                className="min-h-11 flex-1 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50">
                {checking ? "Comprobando…" : "Volver a comprobar"}
              </button>
            ) : null}
          </div>
        </div>
      </dialog>
    </CancioneroNovedadesContext.Provider>
  );
}
