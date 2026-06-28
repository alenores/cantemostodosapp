"use client";

import { BookOpen, Home, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
    label: "Cancionero",
    icon: BookOpen,
    isActive: (pathname) => pathname === "/cancionero",
  },
];

function readModoLecturaHidden() {
  return document.body.getAttribute("data-modo-lectura") === "true";
}

export default function AppFooter() {
  const pathname = usePathname();
  const [modoLecturaHidden, setModoLecturaHidden] = useState(false);

  useEffect(() => {
    setModoLecturaHidden(readModoLecturaHidden());

    const observer = new MutationObserver(() => {
      setModoLecturaHidden(readModoLecturaHidden());
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-modo-lectura"],
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
      <nav className="flex h-[56px] w-full flex-row items-center justify-around">
        {TABS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          const colorClass = active ? "text-accent" : "text-text-muted";

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 ${colorClass}`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
