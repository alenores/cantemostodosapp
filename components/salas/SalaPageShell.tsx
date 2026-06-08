"use client";

import BarraCola from "@/components/salas/BarraCola";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import { Search } from "lucide-react";
import { useState } from "react";

type SalaPageShellProps = {
  salaNombre: string;
};

export default function SalaPageShell({ salaNombre }: SalaPageShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg-app">
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
              Sala activa
            </p>
            <h1 className="truncate text-lg font-extrabold text-text-primary">
              {salaNombre}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Buscar canción"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent"
          >
            <Search className="size-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        className={`relative flex min-h-0 flex-1 flex-col transition-opacity duration-350 ${
          drawerOpen ? "opacity-40" : "opacity-100"
        }`}
        style={{ transitionTimingFunction: "var(--transition-timing)" }}
      >
        <CancionActivaSection />
      </div>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Cerrar cola"
          className="absolute inset-0 bottom-[52px] z-10 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed inset-x-0 bottom-[52px] z-20 flex max-h-[45dvh] flex-col rounded-t-2xl bg-bg-dark transition-transform duration-350 ${
          drawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transitionTimingFunction: "var(--transition-timing)" }}
        aria-hidden={!drawerOpen}
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-6">
          <p className="text-sm text-text-muted">
            Drawer de cola — próximo paso
          </p>
        </div>
      </div>

      <BarraCola
        pendientes={0}
        proximaNombre={null}
        open={drawerOpen}
        onToggle={() => setDrawerOpen((prev) => !prev)}
      />
    </div>
  );
}
