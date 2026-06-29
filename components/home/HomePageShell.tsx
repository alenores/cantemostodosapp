"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import AutoScrollControl from "@/components/home/AutoScrollControl";
import { LETRA_AUTO_SCROLL_MAX_LEVEL } from "@/hooks/useLetraAutoScroll";
import ColaIndividualSheet from "@/components/home/ColaIndividualSheet";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import { avanzarColaIndividual, getColaIndividual } from "@/lib/cola-individual";
import { createClient } from "@/lib/supabase/client";
import type { ColaIndividualItem } from "@/types";
import {
  ListMusic,
  Maximize2,
  Music,
  Search,
  SkipForward,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const LETRA_TEST_PLACEHOLDER = [
  "Verso 1",
  "Lorem ipsum dolor sit amet",
  "Consectetur adipiscing elit",
  "Sed do eiusmod tempor incididunt",
  "",
  "Estribillo",
  "Ut labore et dolore magna aliqua",
  "Ut enim ad minim veniam",
  "Quis nostrud exercitation ullamco",
  "",
  "Verso 2",
  "Duis aute irure dolor in reprehenderit",
  "In voluptate velit esse cillum",
  "Dolore eu fugiat nulla pariatur",
  "",
  "Estribillo",
  "Excepteur sint occaecat cupidatat",
  "Non proident sunt in culpa",
  "Qui officia deserunt mollit anim",
];

export default function HomePageShell() {
  const supabase = useMemo(() => createClient(), []);
  const [cancionActiva, setCancionActiva] = useState<string | null>(null);
  const [modoLectura, setModoLectura] = useState(false);
  const [overlayAbierto, setOverlayAbierto] = useState(false);
  const [colaSheetAbierta, setColaSheetAbierta] = useState(false);
  const [autoScrollLevel, setAutoScrollLevel] = useState(0);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [colaRefreshToken, setColaRefreshToken] = useState(0);

  useEffect(() => {
    if (modoLectura) {
      document.body.setAttribute("data-modo-lectura", "true");
    } else {
      document.body.removeAttribute("data-modo-lectura");
    }

    return () => {
      document.body.removeAttribute("data-modo-lectura");
    };
  }, [modoLectura]);

  useEffect(() => {
    if (!modoLectura) {
      setColaSheetAbierta(false);
    }
  }, [modoLectura]);

  const salirModoLectura = () => {
    setOverlayAbierto(false);
    setColaSheetAbierta(false);
    setModoLectura(false);
  };

  const activarModoLecturaTest = () => {
    setCancionActiva("test");
    setModoLectura(true);
  };

  const handleActivarCancion = useCallback((item: ColaIndividualItem) => {
    setCancionActiva(item.nombre);
    setColaSheetAbierta(false);
  }, []);

  const handleSiguienteIndividual = useCallback(async () => {
    if (pendientesCount === 0) {
      return;
    }

    try {
      await avanzarColaIndividual(supabase);
      setColaRefreshToken((token) => token + 1);
      const cola = await getColaIndividual(supabase);
      const activa = cola.find((item) => item.estado === "activa");
      if (activa) {
        setCancionActiva(activa.nombre);
      }
    } catch (error) {
      console.error("[cola-individual] error al avanzar", error);
    }
  }, [pendientesCount, supabase]);

  const siguienteDisabled = pendientesCount === 0;

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-app"
      style={{
        height: "100dvh",
        ...(!modoLectura
          ? {
              paddingBottom:
                "calc(56px + env(safe-area-inset-bottom, 0px))",
            }
          : {}),
      }}
    >
      {!modoLectura && (
        <header className="flex h-14 shrink-0 flex-row items-center gap-3 border-b border-border bg-bg-dark px-4">
          <Search
            className="size-5 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar canción..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            onFocus={() => {
              console.log("TODO: abrir buscador");
            }}
          />
        </header>
      )}

      <main
        className={`min-h-0 overflow-y-auto ${
          modoLectura ? "" : "flex-1"
        }`}
        style={modoLectura ? { height: "100dvh" } : undefined}
      >
        {cancionActiva === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Music
              className="size-12 text-text-muted/40"
              aria-hidden="true"
            />
            <p className="text-center text-sm text-text-muted">
              Buscá una canción para empezar
            </p>
            <button
              type="button"
              onClick={activarModoLecturaTest}
              className="mt-2 rounded-xl border border-border bg-bg-dark px-4 py-2 text-xs text-text-secondary"
            >
              Activar modo lectura (test)
            </button>
          </div>
        ) : (
          <div className="relative bg-letra-bg px-4 py-6">
            <h1 className="text-lg font-bold text-letra-text">
              {cancionActiva === "test" ? "Canción de prueba" : cancionActiva}
            </h1>
            <p className="mt-1 text-sm text-letra-text/60">Artista demo</p>
            <div className="mt-6 space-y-2">
              {LETRA_TEST_PLACEHOLDER.map((line, index) =>
                line === "" ? (
                  <div key={index} className="h-4" aria-hidden="true" />
                ) : (
                  <p
                    key={index}
                    className="text-base font-bold leading-loose text-letra-text"
                  >
                    {line}
                  </p>
                ),
              )}
            </div>
            {!modoLectura && (
              <button
                type="button"
                onClick={() => setModoLectura(true)}
                className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-bg-dark px-4 py-2 text-xs text-text-secondary"
              >
                <Maximize2 className="size-4" aria-hidden="true" />
                Expandir
              </button>
            )}
          </div>
        )}
      </main>

      {!modoLectura && (
        <ColaIndividualSheet
          modo="colapsable"
          onActivarCancion={handleActivarCancion}
          onPendientesCountChange={setPendientesCount}
          refreshToken={colaRefreshToken}
        />
      )}

      {modoLectura && (
        <>
          <ColaIndividualSheet
            modo="colapsable"
            presentacionOculta
            onActivarCancion={handleActivarCancion}
            onPendientesCountChange={setPendientesCount}
            refreshToken={colaRefreshToken}
          />

          <button
            type="button"
            aria-label={
              overlayAbierto
                ? "Cerrar controles"
                : "Abrir controles de modo lectura"
            }
            onClick={() => setOverlayAbierto((open) => !open)}
            className="fixed z-50 flex size-11 items-center justify-center rounded-full border border-border bg-bg-dark/90 backdrop-blur-sm"
            style={{ top: 16, right: 16 }}
          >
            {overlayAbierto ? (
              <X className="size-5 text-text-primary" aria-hidden="true" />
            ) : (
              <SlidersHorizontal
                className="size-5 text-text-primary"
                aria-hidden="true"
              />
            )}
          </button>

          <ModoLecturaOverlay
            abierto={overlayAbierto}
            onCerrar={() => setOverlayAbierto(false)}
            onSalirModoLectura={salirModoLectura}
          />

          <AutoScrollControl
            level={autoScrollLevel}
            onAccelerate={() =>
              setAutoScrollLevel((level) =>
                Math.min(LETRA_AUTO_SCROLL_MAX_LEVEL, level + 1),
              )
            }
            onDecelerate={() =>
              setAutoScrollLevel((level) => Math.max(0, level - 1))
            }
          />

          <div
            className="fixed z-[45] flex flex-col items-start gap-2"
            style={{
              bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              left: 16,
            }}
          >
            <button
              type="button"
              disabled={siguienteDisabled}
              onClick={() => void handleSiguienteIndividual()}
              className={`flex items-center gap-2 rounded-2xl border border-border bg-bg-dark/90 px-3 py-2 text-xs text-text-primary ${
                siguienteDisabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <span>Siguiente</span>
              <SkipForward className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setColaSheetAbierta(true)}
              className="flex items-center gap-2 rounded-2xl border border-border bg-bg-dark/90 px-3 py-2 text-xs text-text-primary"
            >
              <ListMusic className="size-4" aria-hidden="true" />
              Cola · {pendientesCount}
            </button>
          </div>

          {colaSheetAbierta && (
            <div
              className="fixed bottom-0 left-0 right-0 z-[45] flex flex-col rounded-t-2xl border-t border-border bg-bg-dark"
              style={{
                height: "60vh",
                paddingTop: 16,
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <div className="flex shrink-0 items-center justify-end px-4 pb-2">
                <button
                  type="button"
                  aria-label="Cerrar cola individual"
                  onClick={() => setColaSheetAbierta(false)}
                  className="flex size-8 items-center justify-center text-text-muted"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <ColaIndividualSheet
                modo="sheet"
                onActivarCancion={handleActivarCancion}
                onPendientesCountChange={setPendientesCount}
                refreshToken={colaRefreshToken}
              />
            </div>
          )}
        </>
      )}

      <AppReadyMarker />
    </div>
  );
}
