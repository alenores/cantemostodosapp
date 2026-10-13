"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

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
  titleClassName,
  accentVar = "var(--voz-config)",
  collapsible = false,
  children,
}: {
  title?: string;
  className?: string;
  titleClassName?: string;
  accentVar?: string;
  /** Arranca cerrada. El título la abre y la cierra. */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!collapsible) {
    return (
      <div
        className={`min-w-0 overflow-hidden rounded-xl border border-border/80 bg-bg-darker/70 p-4 ${className ?? ""}`}
      >
        {title ? (
          <p
            className={titleClassName ?? "mb-4 text-[11px] font-bold uppercase tracking-wide"}
            style={{ color: accentVar }}
          >
            {title}
          </p>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border border-border/80 bg-bg-darker/70 ${className ?? ""}`}
    >
      {title ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((actual) => !actual)}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
            open ? "border-b border-white/10" : ""
          }`}
        >
          <span
            className={`${titleClassName ?? "text-[11px] font-bold uppercase tracking-wide"} !mb-0`}
            style={{ color: accentVar }}
          >
            {title}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: accentVar }}
            aria-hidden="true"
          />
        </button>
      ) : null}
      {open ? <div className="px-4 pb-4 pt-3">{children}</div> : null}
    </div>
  );
}
