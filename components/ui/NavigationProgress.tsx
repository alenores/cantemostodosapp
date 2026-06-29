"use client";

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
  startNavigation: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function useStartNavigation(): () => void {
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

export default function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const startNavigation = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setActive(true);
  }, []);

  useEffect(() => {
    setActive(false);

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

      startNavigation();
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

    return () => {
      window.clearTimeout(timeoutId);
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
