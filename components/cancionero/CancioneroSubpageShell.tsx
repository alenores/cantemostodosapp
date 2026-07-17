"use client";

import { TapLink } from "@/components/ui/TapFeedback";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroSubpageShellProps = {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
  /** Destino del botón volver (móvil). Por defecto /canciones. */
  backHref?: string;
  backAriaLabel?: string;
  /** @deprecated El bloqueo de scroll con modales lo hace cada modal en `document.body`. */
  modalOpen?: boolean;
};

export default function CancioneroSubpageShell({
  title,
  headerAction,
  children,
  backHref = "/canciones",
  backAriaLabel = "Volver al cancionero",
}: CancioneroSubpageShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="relative flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      {/* Mobile-only integrated header */}
      {!isDesktop ? (
        <header
          className="shrink-0 bg-transparent px-4 pb-2"
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="app-page-container flex items-center gap-3">
            <TapLink
              href={backHref}
              ariaLabel={backAriaLabel}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card border border-border/40 shadow-sm"
            >
              <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
            </TapLink>
            <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
              {title}
            </h1>
            {headerAction}
          </div>
        </header>
      ) : null}

      <main className="app-page-main flex w-full min-w-0 flex-col gap-3 overflow-x-clip px-4 py-4 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex w-full min-w-0 flex-col gap-4">
          {/* Desktop-only floating integrated header */}
          {isDesktop ? (
            <header className="flex items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl lg:text-[1.75rem] font-extrabold tracking-tight text-text-primary">
                {title}
              </h1>
              {headerAction}
            </header>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
