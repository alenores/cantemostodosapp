"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Home, Library, MicVocal, Music2, Users, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TapLink } from "@/components/ui/TapFeedback";

type TabConfig = {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
};

const TABS: TabConfig[] = [
  {
    href: "/individual",
    label: "Individual",
    icon: Music2,
    isActive: (pathname) =>
      pathname === "/individual" || pathname.startsWith("/individual/"),
  },
  {
    href: "/salas",
    label: "Salas",
    icon: Users,
    isActive: (pathname) =>
      pathname === "/salas" || pathname.startsWith("/salas/"),
  },
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/practica",
    label: "Práctica",
    icon: MicVocal,
    isActive: (pathname) =>
      pathname === "/practica" || pathname.startsWith("/practica/"),
  },
  {
    href: "/canciones",
    label: "Cancionero",
    icon: Library,
    isActive: (pathname) =>
      pathname === "/canciones" || pathname.startsWith("/canciones/"),
  },
];

function readModoLecturaHidden() {
  return document.body.getAttribute("data-modo-lectura") === "true";
}

function readSalaFooterState() {
  const nombre = document.body.getAttribute("data-sala-nombre");
  const conectadosRaw = document.body.getAttribute("data-sala-conectados");

  return {
    salaNombre: nombre,
    conectados: conectadosRaw ? Number(conectadosRaw) : 0,
  };
}

export default function AppFooter() {
  const pathname = usePathname();
  const online = useOnlineStatus();
  const [modoLecturaHidden, setModoLecturaHidden] = useState(false);
  const [salaNombre, setSalaNombre] = useState<string | null>(null);
  const [conectados, setConectados] = useState(0);

  useEffect(() => {
    setModoLecturaHidden(readModoLecturaHidden());
    const { salaNombre: nombre, conectados: count } = readSalaFooterState();
    setSalaNombre(nombre);
    setConectados(count);

    const observer = new MutationObserver(() => {
      setModoLecturaHidden(readModoLecturaHidden());
      const { salaNombre: nextNombre, conectados: nextCount } =
        readSalaFooterState();
      setSalaNombre(nextNombre);
      setConectados(nextCount);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "data-modo-lectura",
        "data-sala-nombre",
        "data-sala-conectados",
      ],
    });

    return () => observer.disconnect();
  }, []);

  if (pathname.startsWith("/auth") || modoLecturaHidden) {
    return null;
  }

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-bg-dark lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="flex h-[56px] w-full flex-row items-center">
        {TABS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          const isSalasTab = href === "/salas";
          const salasUnavailable = isSalasTab && !online;
          const inSala = isSalasTab && salaNombre !== null && online;
          const displayLabel = inSala && salaNombre ? salaNombre : label;
          const showBadge = isSalasTab && conectados > 0 && online;
          const tabColorClass = salasUnavailable
            ? "text-text-faint"
            : active
              ? "text-accent"
              : "text-text-muted";

          return (
            <TapLink
              key={href}
              href={href}
              ariaLabel={
                salasUnavailable ? "Salas no disponible sin conexión" : displayLabel
              }
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 ${tabColorClass}`}
            >
              <span className="relative">
                <Icon className={`size-5 ${salasUnavailable ? "opacity-50" : ""}`} aria-hidden="true" />
                {salasUnavailable ? (
                  <WifiOff
                    className="absolute -right-1.5 -top-1 size-3 text-text-faint"
                    aria-hidden="true"
                  />
                ) : null}
                {showBadge ? (
                  <span
                    className="absolute rounded-[10px] border-[1.5px] border-bg-dark px-[5px] py-px text-[8px] font-bold text-white"
                    style={{
                      top: -4,
                      right: -8,
                      background: "var(--accent)",
                    }}
                  >
                    {conectados}
                  </span>
                ) : null}
              </span>
              <span
                className={`w-full text-center font-medium ${
                  inSala
                    ? "overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-accent"
                    : "text-[9px]"
                }`}
                title={inSala && salaNombre ? salaNombre : undefined}
              >
                {displayLabel}
              </span>
            </TapLink>
          );
        })}
      </nav>
    </footer>
  );
}
