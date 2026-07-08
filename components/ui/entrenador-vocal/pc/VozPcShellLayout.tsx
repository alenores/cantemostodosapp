"use client";

import type { ReactNode } from "react";

export function VozPcShellLayout({
  config,
  practice,
  practiceHeaderExtra,
}: {
  config: ReactNode;
  practice: ReactNode;
  practiceHeaderExtra?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-[min(100%,20rem)] min-w-0 shrink-0 flex-col border-r border-border/80 bg-[color-mix(in_srgb,var(--voz-config)_5%,var(--bg-card))]">
        <div
          data-tool-vertical-scroll=""
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-3 touch-pan-y"
        >
          {config}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--tool-practice-section-bg)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-tool-practice/20 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-tool-practice">
            Practicar
          </p>
          {practiceHeaderExtra}
        </div>

        <div
          data-tool-vertical-scroll=""
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-5 touch-pan-y"
        >
          {practice}
        </div>
      </section>
    </div>
  );
}

export function VozPcConfigCard({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-border/80 bg-bg-darker/70 p-4 ${className ?? ""}`}
    >
      {title ? (
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[var(--voz-config)]">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}
