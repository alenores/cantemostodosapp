"use client";

import {
  CANCIONERO_CHECK_EVENT,
  dispatchCancioneroSyncFinished,
} from "@/lib/offline/cancionero-events";
import {
  checkCancioneroUpdates,
  downloadCancioneroUpdates,
  type CancioneroUpdatePlan,
} from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCancioneroSync() {
  const [plan, setPlan] = useState<CancioneroUpdatePlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const busy = useRef(false);
  const checkRequested = useRef(false);

  const check = useCallback(async () => {
    if (!navigator.onLine) return;
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
      } while (checkRequested.current && navigator.onLine);
      setError(null);
    } catch {
      setError("No se pudieron comprobar las novedades. Tu Cancionero sigue disponible.");
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, []);

  const download = useCallback(async () => {
    if (!plan?.songs.length || busy.current) return false;
    if (!navigator.onLine) {
      setError("Conectate a internet para descargar las novedades.");
      return false;
    }
    busy.current = true;
    setDownloading(true);
    setError(null);
    let downloaded = false;
    try {
      await downloadCancioneroUpdates(createClient(), plan, (completed, total) => {
        setProgress({ completed, total });
      });
      setPlan(null);
      dispatchCancioneroSyncFinished();
      downloaded = true;
      return true;
    } catch {
      setError("No se completó la descarga. Conservamos tu Cancionero anterior. Podés volver a intentar.");
      return false;
    } finally {
      busy.current = false;
      setDownloading(false);
      // Solo vuelve a consultar títulos y versiones, nunca reintenta la descarga automáticamente.
      if (downloaded) void check();
    }
  }, [check, plan]);

  useEffect(() => {
    // Agrupa eventos de guardado y evita duplicar la consulta al montar en Strict Mode.
    let timer: ReturnType<typeof setTimeout>;
    function scheduleCheck() {
      clearTimeout(timer);
      timer = setTimeout(() => { void check(); }, 300);
    }
    scheduleCheck();
    window.addEventListener("online", scheduleCheck);
    window.addEventListener(CANCIONERO_CHECK_EVENT, scheduleCheck);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", scheduleCheck);
      window.removeEventListener(CANCIONERO_CHECK_EVENT, scheduleCheck);
    };
  }, [check]);

  return { plan, checking, downloading, error, progress, check, download };
}
