"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import { Music, Search } from "lucide-react";
import { useState } from "react";

export default function HomePageShell() {
  const [cancionActiva] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-app"
      style={{ height: "100dvh" }}
    >
      <header className="flex h-14 shrink-0 flex-row items-center gap-3 border-b border-border bg-bg-dark px-4">
        <Search className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
        <input
          type="text"
          placeholder="Buscar canción..."
          className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          onFocus={() => {
            console.log("TODO: abrir buscador");
          }}
        />
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto"
        style={{
          paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
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
          </div>
        ) : null}
      </main>

      <footer className="flex h-[52px] shrink-0 items-center justify-center border-t border-border bg-bg-dark">
        <p className="text-xs text-text-muted">Cola individual · próximamente</p>
      </footer>
      <AppReadyMarker />
    </div>
  );
}
