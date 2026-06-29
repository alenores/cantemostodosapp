"use client";

import {
  agregarGuestCola,
  activarGuestColaItem,
  avanzarGuestCola,
  colaHasActivaOPendiente,
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
  vaciarColaIndividual,
  volverAPendienteIndividual,
} from "@/lib/cola-individual";
import { createClient } from "@/lib/supabase/client";
import type { CancionActivaData } from "@/lib/sala-data";
import type { ColaIndividualItem } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export type ColaIndividualRow = ColaIndividualItem | GuestColaItem;

export function useColaIndividual() {
  const supabase = useMemo(() => createClient(), []);
  const [usuarioLogueado, setUsuarioLogueado] = useState<boolean | null>(null);
  const [authItems, setAuthItems] = useState<ColaIndividualItem[]>([]);
  const [guestItems, setGuestItems] = useState<GuestColaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isGuest = usuarioLogueado === false;
  const items: ColaIndividualRow[] = isGuest ? guestItems : authItems;

  const loadAuthCola = useCallback(async () => {
    const cola = await getColaIndividual(supabase);
    setAuthItems(cola);
  }, [supabase]);

  const refresh = useCallback(async () => {
    if (isGuest) {
      return;
    }

    await loadAuthCola();
  }, [isGuest, loadAuthCola]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (!user) {
        setUsuarioLogueado(false);
        setAuthItems([]);
        setLoading(false);
        return;
      }

      setUsuarioLogueado(true);

      try {
        await loadAuthCola();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    function handleColaChanged() {
      if (!cancelled) {
        void loadAuthCola();
      }
    }

    window.addEventListener(COLA_INDIVIDUAL_CHANGED_EVENT, handleColaChanged);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUsuarioLogueado(false);
        setAuthItems([]);
        setGuestItems([]);
        return;
      }

      setUsuarioLogueado(true);
      setGuestItems([]);
      void loadAuthCola();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(COLA_INDIVIDUAL_CHANGED_EVENT, handleColaChanged);
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
    () => items.filter((item) => item.estado === "pendiente").length,
    [items],
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
      if (isGuest) {
        setGuestItems((current) => verAhoraGuestCola(current, cancion));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Se requiere sesión activa");
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

      await loadAuthCola();
      dispatchColaIndividualChanged();
    },
    [isGuest, loadAuthCola, supabase],
  );

  const agregarALista = useCallback(
    async (cancion: CancionInput) => {
      if (isGuest) {
        setGuestItems((current) => agregarGuestCola(current, cancion));
        dispatchColaIndividualChanged();
        return;
      }

      await agregarAColaIndividual(supabase, cancion);
      await loadAuthCola();
      dispatchColaIndividualChanged();
    },
    [isGuest, loadAuthCola, supabase],
  );

  const avanzar = useCallback(async () => {
    if (isGuest) {
      setGuestItems((current) => avanzarGuestCola(current));
      return;
    }

    await avanzarColaIndividual(supabase);
    await loadAuthCola();
  }, [isGuest, loadAuthCola, supabase]);

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
    loading,
    isGuest,
    usuarioLogueado: usuarioLogueado === true,
    cancionActiva,
    hasActivaOPendiente,
    pendientesCount,
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
