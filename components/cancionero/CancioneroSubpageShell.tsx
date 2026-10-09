"use client";

import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { ArrowLeft, X } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroSubpageShellProps = {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
  /** Destino del botón volver (móvil). Por defecto /canciones. */
  backHref?: string;
  /** Si se pasa, el volver llama a esto en vez de navegar con backHref. */
  onBack?: () => void;
  backAriaLabel?: string;
  /** Título a la izquierda y una X a la derecha, en lugar de la flecha. */
  backOnRight?: boolean;
  /** @deprecated El bloqueo de scroll con modales lo hace cada modal en `document.body`. */
  modalOpen?: boolean;
};

export default function CancioneroSubpageShell({
  title,
  headerAction,
  children,
  backHref = "/canciones",
  onBack,
  backAriaLabel = "Volver al cancionero",
  backOnRight = false,
}: CancioneroSubpageShellProps) {
  const isDesktop = useIsDesktop();
  const backIcon = backOnRight ? (
    <X className="size-5 text-text-primary" aria-hidden="true" />
  ) : (
    <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
  );

  const backControl = onBack ? (
    <TapButton
      type="button"
      aria-label={backAriaLabel}
      onClick={onBack}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-card transition-all active:scale-95"
    >
      {backIcon}
    </TapButton>
  ) : (
    <TapLink
      href={backHref}
      ariaLabel={backAriaLabel}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-card transition-all active:scale-95"
    >
      {backIcon}
    </TapLink>
  );

  return (
    <div className="relative flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      {/* Mobile-only integrated header (bajo AppTopHeader del layout) */}
      {!isDesktop ? (
        <header className="shrink-0 border-b border-border/80 bg-bg-dark px-4 py-2.5">
          <div className="app-page-container flex min-h-11 items-center gap-3">
            {backOnRight ? null : backControl}
            <h1 className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-text-primary">
              {title}
            </h1>
            {headerAction}
            {backOnRight ? backControl : null}
          </div>
        </header>
      ) : null}

      <main className="app-page-main flex w-full min-w-0 flex-col gap-3 overflow-x-clip px-4 py-4 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex w-full min-w-0 flex-col gap-4">
          {/* Desktop-only floating integrated header */}
          {isDesktop ? (
            <header className="mb-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {backOnRight || !onBack ? null : backControl}
                <h1 className="text-2xl font-extrabold tracking-tight text-text-primary lg:text-[1.75rem]">
                  {title}
                </h1>
              </div>
              {headerAction}
              {backOnRight ? backControl : null}
            </header>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
