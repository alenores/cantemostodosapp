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
    if (!routeSalaId || nombreById[routeSalaId]) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase
      .from("salas")
      .select("nombre")
      .eq("id", routeSalaId)
      .eq("visible", true)
      .single()
      .then(({ data }) => {
        if (cancelled || !data?.nombre) {
          return;
        }

        setNombreById((current) => ({
          ...current,
          [routeSalaId]: data.nombre,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [nombreById, routeSalaId]);

  const shellSala = useMemo((): SalaRef | null => {
    if (optimisticSala && (!routeSalaId || routeSalaId === optimisticSala.id)) {
      return optimisticSala;
    }

    if (routeSalaId) {
      return {
        id: routeSalaId,
        nombre: nombreById[routeSalaId] ?? "Sala",
      };
    }

    return null;
  }, [nombreById, optimisticSala, routeSalaId]);

  const navigationValue = useMemo(
    () => ({
      enterSala,
      registerSalaNames,
    }),
    [enterSala, registerSalaNames],
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
