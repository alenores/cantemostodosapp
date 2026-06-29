"use client";

import { Home, Users, Wrench } from "lucide-react";
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
    href: "/",
    label: "Home",
    icon: Home,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/salas",
    label: "Salas",
    icon: Users,
    isActive: (pathname) =>
      pathname === "/salas" || pathname.startsWith("/salas/"),
  },
  {
    href: "/cancionero",
    label: "Herramientas",
    icon: Wrench,
    isActive: (pathname) =>
      pathname === "/cancionero" || pathname.startsWith("/cancionero/"),
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
      className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-bg-dark"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <nav className="flex h-[56px] w-full flex-row items-center">
        {TABS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          const colorClass = active ? "text-accent" : "text-text-muted";
          const isSalasTab = href === "/salas";
          const inSala = isSalasTab && salaNombre !== null;
          const displayLabel = inSala && salaNombre ? salaNombre : label;
          const showBadge = isSalasTab && conectados > 0;

          return (
            <TapLink
              key={href}
              href={href}
              ariaLabel={displayLabel}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 ${colorClass}`}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {showBadge ? (
                  <span
                    className="absolute rounded-[10px] border-[1.5px] border-bg-dark px-[5px] py-px text-[8px] font-bold text-white"
                    style={{
                      top: -4,
                      right: -8,
                      background: "#F4845F",
                    }}
                  >
                    {conectados}
                  </span>
                ) : null}
              </span>
              <span
                className={`w-full text-center font-medium ${
                  inSala
                    ? "overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-accent"
                    : "text-[10px]"
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
