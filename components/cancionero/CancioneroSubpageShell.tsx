"use client";

import { TapLink } from "@/components/ui/TapFeedback";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroSubpageShellProps = {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
  /** @deprecated El bloqueo de scroll con modales lo hace cada modal en `document.body`. */
  modalOpen?: boolean;
};

export default function CancioneroSubpageShell({
  title,
  headerAction,
  children,
}: CancioneroSubpageShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="relative flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3 lg:px-8">
        <div className="app-page-container flex items-center gap-3">
          {!isDesktop ? (
            <TapLink
              href="/"
              ariaLabel="Volver al inicio"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
            </TapLink>
          ) : null}
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            {title}
          </h1>
          {headerAction}
        </div>
      </header>

      <main className="app-page-main flex w-full min-w-0 flex-col gap-3 overflow-x-clip px-4 py-4 pb-24 lg:px-8 lg:py-6">
        <div className="app-page-container flex w-full min-w-0 flex-col gap-3 lg:gap-4">
          {children}
        </div>
      </main>
    </div>
  );
}
