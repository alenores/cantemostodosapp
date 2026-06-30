"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type ToolModalSectionProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  collapsible?: boolean;
  collapsedSummary?: string;
  autoCollapseWhen?: boolean;
  defaultExpanded?: boolean;
};
const TOOL_SECTION_STYLES = {
  config: {
    sectionBorder:
      "color-mix(in srgb, var(--voz-config) 38%, var(--border))",
    sectionBg: "color-mix(in srgb, var(--voz-config) 7%, var(--bg-card))",
    dividerBorder:
      "color-mix(in srgb, var(--voz-config) 22%, var(--border))",
    dotClass: "bg-voz-config",
    titleClass: "text-voz-config",
  },
  practice: {
    sectionBorder: "var(--border)",
    sectionBg: "var(--bg-dark)",
    dividerBorder: "var(--border)",
    dotClass: "bg-text-primary",
    titleClass: "text-text-primary",
  },
} as const;

function ToolModalSection({
  variant,
  title,
  subtitle,
  children,
  collapsible = false,
  collapsedSummary,
  autoCollapseWhen = false,
  defaultExpanded = true,
}: ToolModalSectionProps & {
  variant: keyof typeof TOOL_SECTION_STYLES;
}) {
  const styles = TOOL_SECTION_STYLES[variant];
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    if (autoCollapseWhen) {
      setExpanded(false);
    }
  }, [autoCollapseWhen]);

  const headerContent = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span
          className={`size-2 shrink-0 rounded-full ${styles.dotClass}`}
          aria-hidden="true"
        />
        <h3
          className={`text-xs font-bold uppercase tracking-wide ${styles.titleClass}`}
        >
          {title}
        </h3>
      </div>
      {collapsible && !expanded && collapsedSummary ? (
        <p className="mt-1 truncate text-[11px] text-text-secondary">
          {collapsedSummary}
        </p>
      ) : null}
    </div>
  );

  return (
    <section
      className="rounded-[12px] border px-3 py-3"
      style={{
        borderColor: styles.sectionBorder,
        backgroundColor: styles.sectionBg,
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={expanded}
        >
          {headerContent}
          <ChevronDown
            className={`size-5 shrink-0 text-text-muted transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      ) : (
        <header>{headerContent}</header>
      )}
      {expanded ? (
        <>
          <div
            className="mt-2.5 border-b"
            style={{ borderColor: styles.dividerBorder }}
            aria-hidden="true"
          />
          {subtitle ? (
            <p className="mt-2.5 text-[11px] leading-snug text-text-secondary">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-3 space-y-3">{children}</div>
        </>
      ) : null}
    </section>
  );
}

export function ToolConfigSection({
  title = "Configurar",
  subtitle,
  children,
  collapsible,
  collapsedSummary,
  autoCollapseWhen,
  defaultExpanded,
}: ToolModalSectionProps) {
  return (
    <ToolModalSection
      variant="config"
      title={title}
      subtitle={subtitle}
      collapsible={collapsible}
      collapsedSummary={collapsedSummary}
      autoCollapseWhen={autoCollapseWhen}
      defaultExpanded={defaultExpanded}
    >
      {children}
    </ToolModalSection>
  );
}

export function ToolPracticeSection({
  title = "Practicar",
  subtitle,
  children,
}: ToolModalSectionProps) {
  return (
    <ToolModalSection variant="practice" title={title} subtitle={subtitle}>
      {children}
    </ToolModalSection>
  );
}
