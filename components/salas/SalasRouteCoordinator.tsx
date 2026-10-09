"use client";

import SalaPageShell from "@/components/salas/SalaPageShell";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SalaRef = {
  id: number;
  nombre: string;
};

type SalasNavigationContextValue = {
  /** Sala abierta (ruta u optimista). El listado debe pausar presence para no pisar el canal. */
  activeSalaId: number | null;
  enterSala: (sala: SalaRef) => void;
  registerSalaNames: (salas: SalaRef[]) => void;
};

const SalasNavigationContext = createContext<SalasNavigationContextValue | null>(
  null,
);

export function useSalasNavigation(): SalasNavigationContextValue {
  const context = useContext(SalasNavigationContext);

  if (!context) {
    throw new Error("useSalasNavigation debe usarse dentro de SalasRouteCoordinator");
  }

  return context;
}

function parseSalaIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/salas\/(\d+)$/);

  if (!match) {
    return null;
  }

  const salaId = Number(match[1]);

  return Number.isNaN(salaId) ? null : salaId;
}

export default function SalasRouteCoordinator({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const routeSalaId = parseSalaIdFromPath(pathname);

  const [optimisticSala, setOptimisticSala] = useState<SalaRef | null>(null);
  const [nombreById, setNombreById] = useState<Record<number, string>>({});
  const [accesoSalaId, setAccesoSalaId] = useState<number | null>(null);

  const registerSalaNames = useCallback((salas: SalaRef[]) => {
    setNombreById((current) => {
      const next = { ...current };

      for (const sala of salas) {
        next[sala.id] = sala.nombre;
      }

      return next;
    });
  }, []);

  const enterSala = useCallback(
    (sala: SalaRef) => {
      setNombreById((current) => ({ ...current, [sala.id]: sala.nombre }));
      setAccesoSalaId(sala.id);
      setOptimisticSala(sala);
      router.push(`/salas/${sala.id}`);
    },
    [router],
  );

  useEffect(() => {
    if (!optimisticSala || !routeSalaId || routeSalaId !== optimisticSala.id) {
      return;
    }

    setNombreById((current) => ({
      ...current,
      [routeSalaId]: optimisticSala.nombre,
    }));
    setOptimisticSala(null);
  }, [optimisticSala, routeSalaId]);

  useEffect(() => {
    if (!routeSalaId) {
      return;
    }

    if (optimisticSala?.id === routeSalaId) {
      setAccesoSalaId(routeSalaId);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (cancelled) {
        return;
      }

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: membresia, error } = await supabase
        .from("sala_miembros")
        .select("sala_id")
        .eq("sala_id", routeSalaId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !membresia) {
        setAccesoSalaId(null);
        router.replace("/salas?aviso=sin-acceso-sala");
        return;
      }

      setAccesoSalaId(routeSalaId);

      if (nombreById[routeSalaId]) {
        return;
      }

      const { data: sala } = await supabase
        .from("salas")
        .select("nombre")
        .eq("id", routeSalaId)
        .maybeSingle();

      if (cancelled || !sala?.nombre) {
        return;
      }

      setNombreById((current) => ({
        ...current,
        [routeSalaId]: sala.nombre,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [nombreById, optimisticSala?.id, routeSalaId, router]);

  const shellSala = useMemo((): SalaRef | null => {
    if (optimisticSala && (!routeSalaId || routeSalaId === optimisticSala.id)) {
      return optimisticSala;
    }

    if (routeSalaId && accesoSalaId === routeSalaId) {
      return {
        id: routeSalaId,
        nombre: nombreById[routeSalaId] ?? "Sala",
      };
    }

    return null;
  }, [accesoSalaId, nombreById, optimisticSala, routeSalaId]);

  const navigationValue = useMemo(
    () => ({
      activeSalaId: shellSala?.id ?? null,
      enterSala,
      registerSalaNames,
    }),
    [enterSala, registerSalaNames, shellSala?.id],
  );

  return (
    <SalasNavigationContext.Provider value={navigationValue}>
      <div className={shellSala ? "hidden" : "contents"} aria-hidden={Boolean(shellSala)}>
        {children}
      </div>

      {shellSala ? (
        <SalaPageShell
          key={shellSala.id}
          salaId={shellSala.id}
          salaNombre={shellSala.nombre}
        />
      ) : null}
    </SalasNavigationContext.Provider>
  );
}
