"use client";

import { avisarFallaDeRed } from "@/lib/conexion";
import { isOfflineNavigableRoute } from "@/lib/offline/offline-routes";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NavigationProgressContextValue = {
  startNavigation: (href?: string) => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function useStartNavigation(): (href?: string) => void {
  const context = useContext(NavigationProgressContext);

  return context?.startNavigation ?? (() => {});
}

function normalizeHref(href: string): string {
  try {
    const url = new URL(href, "http://local");
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function isInternalNavigationHref(href: string | null): href is string {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"));
}

const NAV_PROGRESS_MAX_MS = 12_000;

/**
 * Si el cambio de pantalla no terminó en este tiempo, la señal se cayó en el medio (2026-10-02):
 * la app todavía se creía con señal y quedaba esperando sin límite. Para las pantallas guardadas
 * en el celular se abre la copia guardada, igual que sin señal.
 */
const NAV_FALLBACK_MS = 6_000;

export default function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHrefRef = useRef<string | null>(null);

  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const currentRouteRef = useRef(currentRoute);

  const startNavigation = useCallback((href?: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    pendingHrefRef.current =
      href && isInternalNavigationHref(href) && normalizeHref(href) !== currentRouteRef.current
        ? href
        : null;
    setActive(true);
  }, []);

  useEffect(() => {
    currentRouteRef.current = currentRoute;
    setActive(false);
    pendingHrefRef.current = null;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [currentRoute]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!isInternalNavigationHref(href)) {
        return;
      }

      const destination = normalizeHref(href);

      if (destination === currentRoute) {
        return;
      }

      const isSalaEntry =
        destination.startsWith("/salas/") && destination !== "/salas";

      if (isSalaEntry) {
        return;
      }

      startNavigation(destination);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [currentRoute, startNavigation]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActive(false);
    }, NAV_PROGRESS_MAX_MS);

    const fallbackId = window.setTimeout(() => {
      const href = pendingHrefRef.current;
      if (!href || !isOfflineNavigableRoute(href)) return;
      pendingHrefRef.current = null;
      avisarFallaDeRed();
      window.location.assign(href);
    }, NAV_FALLBACK_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(fallbackId);
    };
  }, [active]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation }}>
      {children}
      {active && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] overflow-hidden bg-accent/20"
          role="progressbar"
          aria-label="Cargando pantalla"
        >
          <div className="nav-progress-bar h-full w-1/3 bg-accent" />
        </div>
      )}
    </NavigationProgressContext.Provider>
  );
}
