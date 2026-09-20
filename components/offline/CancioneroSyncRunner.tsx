"use client";

import { useCancioneroSync } from "@/hooks/useCancioneroSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CancioneroSyncRunner() {
  const { plan, checking, downloading, error, progress, check, download } = useCancioneroSync();
  const online = useOnlineStatus();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const songs = plan?.songs ?? [];
  useBodyScrollLock(open);
  useHardwareBack(open, () => setOpen(false));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open) dialog?.showModal();
    else dialog?.close();
  }, [open]);

  async function confirmDownload() {
    if (await download()) setOpen(false);
  }

  return (
    <>
      {!pathname.startsWith("/auth/") && (songs.length > 0 || error) && !open ? (
        <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-bg-card p-3 shadow-lg [body[data-modo-lectura=true]_&]:hidden">
          <p className="min-w-0 flex-1 text-sm text-text-primary" role="status">
            {downloading ? "Descargando novedades…" : songs.length > 0
              ? `${songs.length} novedades del Cancionero`
              : error}
          </p>
          <button type="button" onClick={() => setOpen(true)}
            className="min-h-11 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-white">
            {songs.length > 0 ? "Ver novedades" : "Ver aviso"}
          </button>
        </div>
      ) : null}
      <dialog ref={dialogRef} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
        aria-labelledby="cancionero-updates-title"
        aria-describedby="cancionero-updates-description"
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-xl border border-border bg-bg-card p-0 text-text-primary backdrop:bg-black/60">
        <div className="flex max-h-[85dvh] flex-col p-5">
          <h2 id="cancionero-updates-title" className="text-lg font-semibold">Novedades del Cancionero</h2>
          <p id="cancionero-updates-description" className="mt-2 text-sm text-text-muted">
            Al aceptar se descargan todas las canciones nuevas y actualizadas de esta lista.
            Las que no cambiaron quedan en tu celular.
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
              Descargando {progress.completed} de {progress.total}…
            </p>
          ) : null}
          {!songs.length && !error ? (
            <p className="mb-3 text-sm" role="status">{checking ? "Comprobando novedades…" : "Tu Cancionero está al día."}</p>
          ) : null}
          <div className="flex shrink-0 gap-3">
            <button type="button" onClick={() => setOpen(false)}
              className="min-h-11 flex-1 rounded-lg border border-border px-3 text-sm font-semibold">
              {downloading ? "Cerrar" : "Más tarde"}
            </button>
            {songs.length > 0 ? (
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
    </>
  );
}
