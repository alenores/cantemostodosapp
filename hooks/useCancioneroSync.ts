"use client";

import { EVENTO_CONEXION, hayConexion } from "@/lib/conexion";
import {
  CANCIONERO_CHECK_EVENT,
  dispatchCancioneroSyncFinished,
} from "@/lib/offline/cancionero-events";
import {
  checkCancioneroUpdates,
  downloadCancioneroUpdates,
  type CancioneroUpdatePlan,
} from "@/lib/offline/cancionero-sync";
import { syncArtistaFotos } from "@/lib/offline/artista-fotos";
import { getCancioneroLocalMeta } from "@/lib/offline/cancionero-store";
import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCancioneroSync() {
  const [plan, setPlan] = useState<CancioneroUpdatePlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [preparingOffline, setPreparingOffline] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const busy = useRef(false);
  const checkRequested = useRef(false);
  const autoDownloadTried = useRef(false);

  const check = useCallback(async () => {
    if (!hayConexion()) return;
    if (busy.current) {
      checkRequested.current = true;
      return;
    }
    busy.current = true;
    setChecking(true);
    try {
      do {
        checkRequested.current = false;
        setPlan(await checkCancioneroUpdates(createClient()));
      } while (checkRequested.current && hayConexion());
      setError(null);
      void syncArtistaFotos(createClient()).catch(() => {});
    } catch {
      setError("No se pudieron comprobar las novedades. Tu Cancionero sigue disponible.");
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, []);

  const download = useCallback(async () => {
    if (!plan?.songs.length || busy.current) return false;
    /**
     * La descarga la pidió la persona: se frena solo si el teléfono no tiene red, nunca por el
     * detector de señal débil (sus pedidos fallan solos si no hay señal).
     */
    if (!navigator.onLine) {
      setError("Conectate a internet para descargar las novedades.");
      return false;
    }
    busy.current = true;
    setDownloading(true);
    setReady(false);
    setError(null);
    let downloaded = false;
    try {
      await downloadCancioneroUpdates(createClient(), plan, (completed, total) => {
        setProgress({ completed, total });
      });
      setPreparingOffline(true);
      await syncArtistaFotos(createClient());
      const offlineReady = await warmOfflineCache({ force: true });
      if (!offlineReady) {
        throw new Error("offline-preparation-incomplete");
      }
      setPlan(null);
      dispatchCancioneroSyncFinished();
      setReady(true);
      downloaded = true;
      return true;
    } catch {
      setError("No se pudo completar toda la preparación offline. Mantené la conexión y volvé a intentar.");
      return false;
    } finally {
      busy.current = false;
      setPreparingOffline(false);
      setDownloading(false);
      // Solo vuelve a consultar títulos y versiones, nunca reintenta la descarga automáticamente.
      if (downloaded) void check();
    }
  }, [check, plan]);

  /**
   * Primer uso (2026-10-02): si el celular todavía no tiene ninguna descarga del Cancionero, la
   * primera se hace sola, sin esperar a que la persona toque la campanita. Así nadie se encuentra
   * el Cancionero vacío la primera vez que se queda sin señal. Las novedades siguientes siguen
   * pidiendo permiso. Se intenta una vez por apertura de la app: si falla, queda la campanita.
   */
  useEffect(() => {
    if (!plan?.songs.length || autoDownloadTried.current || busy.current) return;
    let cancelled = false;
    void getCancioneroLocalMeta().then((meta) => {
      if (cancelled || meta.syncedAt || autoDownloadTried.current) return;
      autoDownloadTried.current = true;
      void download();
    });
    return () => { cancelled = true; };
  }, [plan, download]);

  useEffect(() => {
    // Agrupa eventos de guardado y evita duplicar la consulta al montar en Strict Mode.
    let timer: ReturnType<typeof setTimeout>;
    function scheduleCheck() {
      clearTimeout(timer);
      timer = setTimeout(() => { void check(); }, 300);
    }
    scheduleCheck();
    window.addEventListener("online", scheduleCheck);
    window.addEventListener(EVENTO_CONEXION, scheduleCheck);
    window.addEventListener(CANCIONERO_CHECK_EVENT, scheduleCheck);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", scheduleCheck);
      window.removeEventListener(EVENTO_CONEXION, scheduleCheck);
      window.removeEventListener(CANCIONERO_CHECK_EVENT, scheduleCheck);
    };
  }, [check]);

  return {
    plan, checking, downloading, preparingOffline, ready, error, progress,
    check, download, dismissReady: () => setReady(false),
  };
}
