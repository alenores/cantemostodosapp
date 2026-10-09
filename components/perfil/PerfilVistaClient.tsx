"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import UserAvatar from "@/components/perfil/UserAvatar";
import SalaAvatar from "@/components/salas/SalaAvatar";
import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { listCancionesPractica } from "@/lib/canciones-practica";
import { clearAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { getPerfilAvisoMensaje } from "@/lib/perfil-avisos";
import { createClient } from "@/lib/supabase/client";
import type { UsuarioActivo } from "@/types";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type PerfilCancionFila = {
  id: number;
  nombre: string;
  artista: string | null;
};

export type PerfilSalaFila = {
  id: number;
  nombre: string;
  avatar_url: string | null;
};

type Fila = {
  id: number;
  titulo: string;
  subtitulo?: string | null;
  href?: string;
  avatarUrl?: string | null;
  esSala?: boolean;
};

type PerfilVistaClientProps = {
  usuario: UsuarioActivo;
  avisoInicial?: string | null;
  aportadas: PerfilCancionFila[];
  favoritas: PerfilCancionFila[];
  entrenadorInicial: PerfilCancionFila[];
  salas: PerfilSalaFila[];
  aportadasConError?: boolean;
  favoritasConError?: boolean;
  entrenadorConError?: boolean;
  salasConError?: boolean;
};

function filasCancion(
  canciones: PerfilCancionFila[],
  hrefDe?: (cancion: PerfilCancionFila) => string,
): Fila[] {
  return canciones.map((cancion) => ({
    id: cancion.id,
    titulo: cancion.nombre,
    subtitulo: cancion.artista,
    href: hrefDe?.(cancion),
  }));
}

type PestanaId = "aportadas" | "favoritas" | "entrenador" | "salas";

function MenuPerfil() {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    function cerrarSiTocaAfuera(event: PointerEvent) {
      if (!contenedorRef.current?.contains(event.target as Node)) {
        setAbierto(false);
      }
    }

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierto(false);
      }
    }

    document.addEventListener("pointerdown", cerrarSiTocaAfuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarSiTocaAfuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <TapButton
        type="button"
        aria-label="Más opciones"
        aria-expanded={abierto}
        aria-haspopup="menu"
        onClick={() => setAbierto((valor) => !valor)}
        className="flex size-10 items-center justify-center rounded-full text-text-muted"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </TapButton>
      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[9.5rem] overflow-hidden rounded-xl border border-border bg-bg-card py-1 shadow-lg"
        >
          <TapLink
            href="/perfil/editar"
            className="block px-3 py-2.5 text-left text-sm text-text-primary"
          >
            Editar
          </TapLink>
        </div>
      ) : null}
    </div>
  );
}

const LOTE_LISTA = 40;

function ListaPerfil({
  verHref,
  vacio,
  filas,
}: {
  verHref?: string;
  vacio: string;
  filas: Fila[];
}) {
  const [cantidad, setCantidad] = useState(LOTE_LISTA);
  const finRef = useRef<HTMLLIElement>(null);
  const visibles = filas.slice(0, cantidad);
  const hayMas = cantidad < filas.length;

  useEffect(() => {
    const nodo = finRef.current;
    if (!hayMas || !nodo) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCantidad((actual) => Math.min(actual + LOTE_LISTA, filas.length));
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(nodo);
    return () => observer.disconnect();
  }, [hayMas, filas.length]);

  return (
    <div className="min-w-0">
      {verHref ? (
        <div className="flex justify-end pb-1">
          <TapLink href={verHref} className="text-xs text-text-muted">
            Ver todas
          </TapLink>
        </div>
      ) : null}
      {filas.length === 0 ? (
        <p className="py-1.5 text-sm text-text-faint">{vacio}</p>
      ) : (
        <ul className="list-none p-0">
          {visibles.map((fila) => {
            const contenido = (
              <>
                {fila.esSala ? (
                  <SalaAvatar
                    nombre={fila.titulo}
                    avatarUrl={fila.avatarUrl}
                    sizeClassName="size-6"
                    iconClassName="size-3"
                    roundedClassName="rounded-md"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  {fila.titulo}
                </span>
                {fila.subtitulo ? (
                  <span className="max-w-[46%] shrink-0 truncate text-xs text-text-muted">
                    {fila.subtitulo}
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={fila.id} className="border-b border-border/35 last:border-b-0">
                {fila.href ? (
                  <TapLink
                    href={fila.href}
                    className="flex w-full items-center gap-2.5 py-2"
                  >
                    {contenido}
                  </TapLink>
                ) : (
                  <div className="flex items-center gap-2.5 py-2">{contenido}</div>
                )}
              </li>
            );
          })}
          {hayMas ? <li ref={finRef} className="h-px" aria-hidden="true" /> : null}
        </ul>
      )}
    </div>
  );
}

export default function PerfilVistaClient({
  usuario,
  avisoInicial = null,
  aportadas,
  favoritas,
  entrenadorInicial,
  salas,
  aportadasConError = false,
  favoritasConError = false,
  entrenadorConError = false,
  salasConError = false,
}: PerfilVistaClientProps) {
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [pestana, setPestana] = useState<PestanaId>("aportadas");
  const [entrenador, setEntrenador] = useState(entrenadorInicial);
  const [entrenadorConEnlace, setEntrenadorConEnlace] = useState(false);
  const [entrenadorError, setEntrenadorError] = useState(entrenadorConError);
  const avisoMensaje = getPerfilAvisoMensaje(avisoInicial);
  const nombreVisible = usuario.nombre.trim() || "Sin nombre";

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    void listCancionesPractica(supabase)
      .then((items) => {
        if (cancelado) {
          return;
        }
        if (items.length === 0 && entrenadorInicial.length > 0) {
          return;
        }
        setEntrenador(
          items.map((item) => ({
            id: item.id,
            nombre: item.nombre,
            artista: item.artista,
          })),
        );
        setEntrenadorConEnlace(items.length > 0);
        if (items.length > 0 || !entrenadorConError) {
          setEntrenadorError(false);
        }
      })
      .catch(() => {
        if (entrenadorInicial.length === 0) {
          setEntrenadorError(true);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [entrenadorInicial.length]);

  async function handleLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    const supabase = createClient();
    await clearAppSnapshot();
    await supabase.auth.signOut();
    startNavigation();
    router.replace("/auth/login");
  }

  const filasEntrenador = filasCancion(
    entrenador,
    entrenadorConEnlace
      ? (cancion) => `/practica/entrenador-canciones/ver?id=${cancion.id}`
      : undefined,
  );

  const pestanas: {
    id: PestanaId;
    titulo: string;
    verHref?: string;
    vacio: string;
    filas: Fila[];
  }[] = [
    {
      id: "aportadas",
      titulo: "Aportadas",
      vacio: aportadasConError
        ? "No se pudo cargar"
        : "Todavía no aportaste canciones",
      filas: filasCancion(aportadas),
    },
    {
      id: "favoritas",
      titulo: "Favoritas",
      verHref: "/canciones/favoritas",
      vacio: favoritasConError
        ? "No se pudo cargar"
        : "Todavía no tenés favoritas",
      filas: filasCancion(favoritas),
    },
    {
      id: "entrenador",
      titulo: "Entrenador",
      verHref: "/practica/entrenador-canciones",
      vacio: entrenadorError
        ? "No se pudo cargar"
        : "Todavía no tenés canciones en el entrenador",
      filas: filasEntrenador,
    },
    {
      id: "salas",
      titulo: "Salas",
      verHref: "/salas",
      vacio: salasConError
        ? "No se pudo cargar"
        : "Todavía no estás en ninguna sala",
      filas: salas.map((sala) => ({
        id: sala.id,
        titulo: sala.nombre,
        href: `/salas/${sala.id}`,
        avatarUrl: sala.avatar_url,
        esSala: true,
      })),
    },
  ];
  const pestanaActiva = pestanas.find((item) => item.id === pestana) ?? pestanas[0]!;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />
      <header
        className="shrink-0 bg-transparent px-4 pb-2 lg:hidden"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="app-page-container flex items-center gap-3">
          <TapLink
            href="/"
            ariaLabel="Volver al inicio"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/40 bg-bg-card shadow-sm"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            Mi perfil
          </h1>
          <MenuPerfil />
        </div>
      </header>

      <main className="app-page-main flex flex-1 flex-col gap-8 px-4 py-4 pb-24 lg:gap-8 lg:px-8 lg:py-8 lg:pb-8">
        <div className="app-page-container flex w-full flex-col gap-8">
          <div className="hidden items-center justify-between gap-4 lg:flex">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Mi perfil
            </h1>
            <div className="flex items-center gap-2">
              <TapButton
                type="button"
                onClick={() => void handleLogout()}
                disabled={logoutLoading}
                className="min-h-10 rounded-[10px] border border-border bg-bg-card px-5 text-sm font-semibold text-text-primary disabled:opacity-60"
              >
                {logoutLoading ? "Cerrando sesión..." : "Cerrar sesión"}
              </TapButton>
              <MenuPerfil />
            </div>
          </div>

          {avisoMensaje ? (
            <p
              className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
              role="status"
            >
              {avisoMensaje}
            </p>
          ) : null}

          <div className="flex flex-col items-center gap-3 text-center lg:flex-row lg:items-center lg:gap-5 lg:text-left">
            <UserAvatar
              nombre={usuario.nombre}
              email={usuario.email}
              avatarUrl={usuario.avatar_url}
              size={104}
              className="text-3xl"
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold tracking-tight text-text-primary">
                {nombreVisible}
              </p>
              <p className="mt-0.5 truncate text-sm text-text-muted">{usuario.email}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div
              role="tablist"
              aria-label="Listas del perfil"
              className="flex gap-1 overflow-x-auto border-b border-border/50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {pestanas.map((item) => {
                const activa = item.id === pestanaActiva.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`perfil-tab-${item.id}`}
                    aria-selected={activa}
                    aria-controls={`perfil-panel-${item.id}`}
                    onClick={() => setPestana(item.id)}
                    className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
                      activa
                        ? "border-accent font-semibold text-text-primary"
                        : "border-transparent text-text-muted"
                    }`}
                  >
                    {item.titulo}
                    <span className="ml-1.5 text-xs font-normal tabular-nums text-text-faint">
                      {item.filas.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              role="tabpanel"
              id={`perfil-panel-${pestanaActiva.id}`}
              aria-labelledby={`perfil-tab-${pestanaActiva.id}`}
            >
              <ListaPerfil
                key={pestanaActiva.id}
                verHref={pestanaActiva.verHref}
                vacio={pestanaActiva.vacio}
                filas={pestanaActiva.filas}
              />
            </div>
          </div>

          <TapButton
            type="button"
            onClick={() => void handleLogout()}
            disabled={logoutLoading}
            className="min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base font-medium text-text-muted disabled:opacity-60 lg:hidden"
          >
            {logoutLoading ? "Cerrando sesión..." : "Cerrar sesión"}
          </TapButton>
        </div>
      </main>
    </div>
  );
}
