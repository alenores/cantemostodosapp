"use client";

import { TapLink } from "@/components/ui/TapFeedback";
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
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center gap-3">
          <TapLink
            href="/cancionero"
            ariaLabel="Volver a herramientas"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            {title}
          </h1>
          {headerAction}
        </div>
      </header>

      <main className="flex flex-col gap-3 px-4 py-4 pb-24">{children}</main>
    </div>
  );
}
