"use client";

import { EVENTO_CONEXION, hayConexion } from "@/lib/conexion";
import {
  agregarGuestCola,
  activarGuestColaItem,
  avanzarGuestCola,
  colaHasActivaOPendiente,
  colaIndividualPuedeAvanzar,
  deleteGuestColaItem,
  deriveCancionActivaFromGuestCola,
  reorderGuestColaPendientes,
  vaciarGuestCola,
  verAhoraGuestCola,
  volverAPendienteGuestCola,
  type GuestColaItem,
} from "@/lib/cola-individual-guest";
import {
  COLA_INDIVIDUAL_CHANGED_EVENT,
  dispatchColaIndividualChanged,
} from "@/lib/cola-individual-events";
import type { CancionInput } from "@/lib/cola-logic";
import {
  agregarAColaIndividual,
  avanzarColaIndividual,
  eliminarDeColaIndividual,
  getColaIndividual,
  persistirOrdenColaIndividual,
  reciclarTocadasViejasIndividual,
  vaciarColaIndividual,
  volverAPendienteIndividual,
} from "@/lib/cola-individual";
import { createClient } from "@/lib/supabase/client";
import { getActiveUserId, leerIdUsuarioGuardado } from "@/lib/auth/offline-user";
import { readColaIndividual, addColaIndividualLocal } from "@/lib/offline/cola-individual-store";
import type { CancionActivaData } from "@/lib/sala-data";
import type { ColaIndividualItem } from "@/types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCancioneroLocalAll } from "@/lib/offline/cancionero-store";
import { cancionDisponibleOffline } from "@/lib/cola-offline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ColaIndividualRow = ColaIndividualItem | GuestColaItem;

export function useColaIndividual() {
  const supabase = useMemo(() => createClient(), []);
  const [usuarioLogueado, setUsuarioLogueado] = useState<boolean | null>(null);
  const [authItems, setAuthItems] = useState<ColaIndividualItem[]>([]);
  const [guestItems, setGuestItems] = useState<GuestColaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cuentaFilaRef = useRef<string | null | undefined>(undefined);
  const online = useOnlineStatus();
  const [descargadas, setDescargadas] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void getCancioneroLocalAll().then(songs => {
      if (!cancelled) setDescargadas(new Set(songs.filter(song => song.letra?.trim()).map(song => song.id)));
    });
    return () => { cancelled = true; };
  }, [online]);

  const isGuest = usuarioLogueado === false;
  const items: ColaIndividualRow[] = isGuest ? guestItems : authItems;
  const noDisponibles = useMemo(() => new Set(items.filter(item => !online && !cancionDisponibleOffline(item, descargadas)).map(item => item.id)), [items, online, descargadas]);
  const activaNoDisponible = items.some(item => item.estado === "activa" && noDisponibles.has(item.id));

  const loadAuthCola = useCallback(async () => {
    const userId = await getActiveUserId(supabase);
    if (!userId || cuentaFilaRef.current !== userId) return;
    const saved = await readColaIndividual(userId);
    if (cuentaFilaRef.current !== userId) return;
    if (saved) setAuthItems(saved.items);
    const cola = await getColaIndividual(supabase);
    if (cuentaFilaRef.current === userId && cola.every((item) => item.user_id === userId)) {
      setAuthItems(cola);
    }
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (isGuest) {
      return;
    }

    await loadAuthCola();
  }, [isGuest, loadAuthCola]);

  useEffect(() => {
    let cancelled = false;
    let revision = 0;

    async function mostrarFila(userId: string | null) {
      if (cancelled || cuentaFilaRef.current === userId) return;
      const carga = ++revision;
      const sigueVigente = () => !cancelled && carga === revision;
      cuentaFilaRef.current = userId;
      setUsuarioLogueado(userId !== null);
      setAuthItems([]);
      if (!userId) {
        setLoading(false);
        return;
      }

      setGuestItems([]);
      setLoading(true);
      try {
        const saved = await readColaIndividual(userId);
        if (!sigueVigente()) return;
        if (saved) {
          setAuthItems(saved.items);
          if (hayConexion()) void getColaIndividual(supabase).catch(() => undefined);
          return;
        }
        if (!hayConexion()) return;

        const cola = await getColaIndividual(supabase);
        if (sigueVigente() && cola.every((item) => item.user_id === userId)) {
          setAuthItems(cola);
        }
      } finally {
        if (sigueVigente()) setLoading(false);
      }
    }

    void leerIdUsuarioGuardado()
      .catch(() => null)
      .then((userId) => {
        if (revision === 0) return mostrarFila(userId);
      })
      .catch(() => undefined);

    function handleColaChanged() {
      if (!cancelled) {
        void loadAuthCola().catch(() => {});
      }
    }

    function handleConexion() {
      void getColaIndividual(supabase).catch(() => undefined);
    }

    window.addEventListener(COLA_INDIVIDUAL_CHANGED_EVENT, handleColaChanged);
    window.addEventListener("online", handleConexion);
    window.addEventListener(EVENTO_CONEXION, handleConexion);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        setGuestItems([]);
        void mostrarFila(null);
        return;
      }

      // La lectura local cede el turno antes de consultar la sesión.
      const userId = session?.user?.id;
      if (userId) void mostrarFila(userId).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      cuentaFilaRef.current = undefined;
      window.removeEventListener(COLA_INDIVIDUAL_CHANGED_EVENT, handleColaChanged);
      window.removeEventListener("online", handleConexion);
      window.removeEventListener(EVENTO_CONEXION, handleConexion);
      subscription.unsubscribe();
    };
  }, [loadAuthCola, supabase]);

  const cancionActiva: CancionActivaData | null = useMemo(() => {
    const source = isGuest ? guestItems : authItems;
    return deriveCancionActivaFromGuestCola(source);
  }, [authItems, guestItems, isGuest]);

  const hasActivaOPendiente = useMemo(() => {
    if (isGuest) {
      return colaHasActivaOPendiente(guestItems);
    }

    return authItems.some(
      (item) => item.estado === "activa" || item.estado === "pendiente",
    );
  }, [authItems, guestItems, isGuest]);

  const pendientesCount = useMemo(
    () => items.filter((item) => item.estado === "pendiente" && !noDisponibles.has(item.id)).length,
    [items, noDisponibles],
  );

  const puedeAvanzar = useMemo(
    () => colaIndividualPuedeAvanzar(items, (item) => !noDisponibles.has(item.id)),
    [items, noDisponibles],
  );

  const setItems = useCallback(
    (next: ColaIndividualRow[]) => {
      if (isGuest) {
        setGuestItems(next as GuestColaItem[]);
        return;
      }

      setAuthItems(next as ColaIndividualItem[]);
    },
    [isGuest],
  );

  const verAhora = useCallback(
    async (cancion: CancionInput) => {
      if (!hayConexion() && !cancionDisponibleOffline(cancion, descargadas)) throw new Error("Esta canción requiere conexión.");
      if (isGuest) {
        setGuestItems((current) => verAhoraGuestCola(current, cancion));
        return;
      }

      const userId = await getActiveUserId(supabase);

      if (!userId) {
        throw new Error("Se requiere sesión activa");
      }

      if (!hayConexion()) {
        await addColaIndividualLocal(userId, cancion, true);
        await loadAuthCola();
        return;
      }

      const cola = await getColaIndividual(supabase);
      const activa = cola.find((item) => item.estado === "activa");

      if (
        activa &&
        activa.nombre === cancion.nombre.trim() &&
        (activa.url_letra ?? "") === (cancion.url_letra ?? "")
      ) {
        return;
      }

      if (activa) {
        await supabase
          .from("cola_individual")
          .update({ estado: "tocada" })
          .eq("id", activa.id);
      }

      const maxOrden = cola.reduce((max, item) => Math.max(max, item.orden), -1);

      const { error } = await supabase.from("cola_individual").insert({
        user_id: userId,
        nombre: cancion.nombre.trim(),
        artista: cancion.artista?.trim() || null,
        url_letra: cancion.url_letra ?? null,
        letra_texto: cancion.letra_texto ?? null,
        orden: maxOrden + 1,
        estado: "activa",
      });

      if (error) {
        throw error;
      }

      await reciclarTocadasViejasIndividual(supabase, userId);
      await loadAuthCola();
      dispatchColaIndividualChanged();
    },
    [isGuest, loadAuthCola, supabase, descargadas],
  );

  const agregarALista = useCallback(
    async (cancion: CancionInput) => {
      if (!hayConexion() && !cancionDisponibleOffline(cancion, descargadas)) throw new Error("Esta canción requiere conexión.");
      if (isGuest) {
        setGuestItems((current) => agregarGuestCola(current, cancion));
        dispatchColaIndividualChanged();
        return;
      }

      await agregarAColaIndividual(supabase, cancion);
      await loadAuthCola();
      dispatchColaIndividualChanged();
    },
    [isGuest, loadAuthCola, supabase, descargadas],
  );

  const avanzar = useCallback(async () => {
    if (isGuest) {
      setGuestItems((current) => avanzarGuestCola(current, item => online || cancionDisponibleOffline(item, descargadas)));
      return;
    }

    await avanzarColaIndividual(supabase);
    await loadAuthCola();
  }, [isGuest, loadAuthCola, supabase, online, descargadas]);

  const activarItem = useCallback(
    async (itemId: number) => {
      if (isGuest) {
        setGuestItems((current) => activarGuestColaItem(current, itemId));
        return;
      }

      const cola = await getColaIndividual(supabase);
      const activa = cola.find((item) => item.estado === "activa");

      if (activa && activa.id !== itemId) {
        await supabase
          .from("cola_individual")
          .update({ estado: "tocada" })
          .eq("id", activa.id);
      }

      await supabase
        .from("cola_individual")
        .update({ estado: "activa" })
        .eq("id", itemId);

      const userId = await getActiveUserId(supabase);
      if (userId) await reciclarTocadasViejasIndividual(supabase, userId);

      await loadAuthCola();
    },
    [isGuest, loadAuthCola, supabase],
  );

  const eliminarItem = useCallback(
    async (itemId: number) => {
      if (isGuest) {
        setGuestItems((current) => deleteGuestColaItem(current, itemId));
        return;
      }

      await eliminarDeColaIndividual(supabase, itemId);
      await loadAuthCola();
    },
    [isGuest, loadAuthCola, supabase],
  );

  const vaciarTodo = useCallback(async () => {
    if (isGuest) {
      setGuestItems(vaciarGuestCola());
      return;
    }

    await vaciarColaIndividual(supabase);
    await loadAuthCola();
  }, [isGuest, loadAuthCola, supabase]);

  const volverAPendiente = useCallback(
    async (itemId: number) => {
      if (isGuest) {
        setGuestItems((current) => volverAPendienteGuestCola(current, itemId));
        return;
      }

      await volverAPendienteIndividual(supabase, itemId);
      await loadAuthCola();
    },
    [isGuest, loadAuthCola, supabase],
  );

  const reordenarPendientes = useCallback(
    async (activeId: number, overId: number) => {
      if (isGuest) {
        setGuestItems((current) =>
          reorderGuestColaPendientes(current, activeId, overId),
        );
        return;
      }

      const cola = await getColaIndividual(supabase);
      const pendientes = cola
        .filter((item) => item.estado === "pendiente")
        .sort((a, b) => a.orden - b.orden);

      const activeIndex = pendientes.findIndex((item) => item.id === activeId);
      const overIndex = pendientes.findIndex((item) => item.id === overId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return;
      }

      const reordered = [...pendientes];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);

      const anchorOrden = Math.max(
        0,
        ...cola
          .filter((item) => item.estado !== "pendiente")
          .map((item) => item.orden),
      );

      const updates = reordered.map((item, index) => ({
        ...item,
        orden: anchorOrden + index + 1,
      }));

      const nextCola = cola.map((item) => {
        const updated = updates.find((u) => u.id === item.id);
        return updated ?? item;
      });

      setAuthItems(nextCola);
      await persistirOrdenColaIndividual(supabase, nextCola);
    },
    [isGuest, supabase],
  );

  return {
    items,
    noDisponibles,
    activaNoDisponible,
    loading,
    isGuest,
    usuarioLogueado: usuarioLogueado === true,
    cancionActiva,
    hasActivaOPendiente,
    pendientesCount,
    puedeAvanzar,
    setItems,
    refresh,
    verAhora,
    agregarALista,
    avanzar,
    activarItem,
    eliminarItem,
    vaciarTodo,
    volverAPendiente,
    reordenarPendientes,
  };
}
