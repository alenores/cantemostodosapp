"use client";

import UserAvatar from "@/components/perfil/UserAvatar";
import { TapLink } from "@/components/ui/TapFeedback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { APP_SIDEBAR_WIDTH_CSS } from "@/lib/app-layout";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { UsuarioActivo } from "@/types";
import { Home, LogIn, Music2, Users, WifiOff } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type TabConfig = {
  href: string;
  label: string;
  description: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
};

const TABS: TabConfig[] = [
  {
    href: "/",
    label: "Inicio",
    description: "Herramientas y cancionero",
    icon: Home,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/individual",
    label: "Individual",
    description: "Cantar solo con cola personal",
    icon: Music2,
    isActive: (pathname) =>
      pathname === "/individual" || pathname.startsWith("/individual/"),
  },
  {
    href: "/salas",
    label: "Salas",
    description: "Cantar en grupo en tiempo real",
    icon: Users,
    isActive: (pathname) =>
      pathname === "/salas" || pathname.startsWith("/salas/"),
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

export default function AppSidebar() {
  const pathname = usePathname();
  const online = useOnlineStatus();
  const [modoLecturaHidden, setModoLecturaHidden] = useState(false);
  const [salaNombre, setSalaNombre] = useState<string | null>(null);
  const [conectados, setConectados] = useState(0);
  const [usuario, setUsuario] = useState<UsuarioActivo>(OFFLINE_GUEST_USUARIO);

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

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUsuario(
        session?.user
          ? mapUserToUsuarioActivo(session.user)
          : OFFLINE_GUEST_USUARIO,
      );
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(
        session?.user
          ? mapUserToUsuarioActivo(session.user)
          : OFFLINE_GUEST_USUARIO,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  if (pathname.startsWith("/auth") || modoLecturaHidden) {
    return null;
  }

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;
  const displayName = isLoggedIn
    ? usuario.nombre.trim() || "Mi perfil"
    : "Invitado";

  return (
    <aside
      className="app-sidebar fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-bg-darker lg:flex"
      style={{ width: APP_SIDEBAR_WIDTH_CSS }}
      aria-label="Navegación principal"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-accent/30 bg-accent px-5 py-4">
        <Image
          src="/logo.svg"
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-lg"
          aria-hidden="true"
        />
        <p className="min-w-0 truncate text-base font-extrabold tracking-tight text-bg-darker">
          CantemosTodos
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {TABS.map(({ href, label, description, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          const isSalasTab = href === "/salas";
          const salasUnavailable = isSalasTab && !online;
          const inSala = isSalasTab && salaNombre !== null && online;
          const displayLabel = inSala && salaNombre ? salaNombre : label;
          const showBadge = isSalasTab && conectados > 0 && online;

          return (
            <TapLink
              key={href}
              href={href}
              ariaLabel={
                salasUnavailable
                  ? "Salas no disponible sin conexión"
                  : `${displayLabel}: ${description}`
              }
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                salasUnavailable
                  ? "text-text-faint"
                  : active
                    ? "bg-accent-dim text-accent"
                    : "text-text-muted hover:bg-bg-card hover:text-text-primary"
              }`}
            >
              {active ? (
                <span
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
                  aria-hidden="true"
                />
              ) : null}

              <span className="relative shrink-0">
                <Icon
                  className={`size-5 ${salasUnavailable ? "opacity-50" : ""}`}
                  aria-hidden="true"
                />
                {salasUnavailable ? (
                  <WifiOff
                    className="absolute -right-1 -top-1 size-3 text-text-faint"
                    aria-hidden="true"
                  />
                ) : null}
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full border-2 border-bg-darker bg-accent text-[9px] font-bold text-white">
                    {conectados}
                  </span>
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-semibold ${
                    inSala ? "text-accent" : ""
                  }`}
                  title={inSala && salaNombre ? salaNombre : undefined}
                >
                  {displayLabel}
                </span>
                <span className="block truncate text-[11px] opacity-70">
                  {description}
                </span>
              </span>
            </TapLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        {isLoggedIn ? (
          <TapLink
            href="/perfil"
            ariaLabel="Mi perfil"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-card"
          >
            <UserAvatar
              nombre={usuario.nombre}
              email={usuario.email}
              avatarUrl={usuario.avatar_url}
              size={36}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text-primary">
                {displayName}
              </span>
              <span className="block truncate text-[11px] text-text-muted">
                {usuario.email}
              </span>
            </span>
          </TapLink>
        ) : (
          <TapLink
            href="/auth/login"
            ariaLabel="Iniciar sesión"
            className="flex items-center gap-3 rounded-xl border border-border bg-bg-card px-3 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent/40 hover:bg-bg-card-hover"
          >
            <LogIn className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <span>Iniciar sesión</span>
          </TapLink>
        )}
      </div>
    </aside>
  );
}
