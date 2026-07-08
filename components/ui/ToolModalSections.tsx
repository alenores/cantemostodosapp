"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Gutter horizontal del cuerpo del modal en móvil (alineado con entrenador vocal). */
export const TOOL_MODAL_MOBILE_GUTTER_CLASS = "px-3 lg:px-6";

/** Cancela el gutter del modal para usar todo el ancho útil del panel. */
export const TOOL_MODAL_MOBILE_BLEED_CLASS = "-mx-3 px-3";

export function ToolModalMobileBleed({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${TOOL_MODAL_MOBILE_BLEED_CLASS} ${className}`.trim()}>
      {children}
    </div>
  );
}

type ToolModalSectionProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  collapsible?: boolean;
  collapsedSummary?: string;
  autoCollapseWhen?: boolean;
  defaultExpanded?: boolean;
  headerAction?: ReactNode;
};
const TOOL_SECTION_STYLES = {
  config: {
    sectionBorder:
      "color-mix(in srgb, var(--voz-config) 38%, var(--border))",
    sectionBg: "color-mix(in srgb, var(--voz-config) 7%, var(--bg-card))",
    dividerBorder:
      "color-mix(in srgb, var(--voz-config) 22%, var(--border))",
    accentColor: "var(--voz-config)",
  },
  practice: {
    sectionBorder:
      "color-mix(in srgb, var(--tool-practice) 38%, var(--border))",
    sectionBg: "var(--tool-practice-section-bg)",
    dividerBorder:
      "color-mix(in srgb, var(--tool-practice) 22%, var(--border))",
    accentColor: "var(--tool-practice)",
  },
  compositorConfig: {
    sectionBorder:
      "color-mix(in srgb, var(--compositor-config) 38%, var(--border))",
    sectionBg:
      "color-mix(in srgb, var(--compositor-config) 7%, var(--bg-card))",
    dividerBorder:
      "color-mix(in srgb, var(--compositor-config) 22%, var(--border))",
    accentColor: "var(--compositor-config)",
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
  headerAction,
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
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: styles.accentColor }}
          aria-hidden="true"
        />
        <h3
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: styles.accentColor }}
        >
          {title}
        </h3>
        {headerAction}
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
      <div className="flex items-start gap-1.5">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
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
          <header className="min-w-0 flex-1">{headerContent}</header>
        )}
      </div>
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
  headerAction,
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
      headerAction={headerAction}
    >
      {children}
    </ToolModalSection>
  );
}

export function ToolPracticeSection({
  title = "Practicar",
  subtitle,
  children,
  collapsible,
  collapsedSummary,
  autoCollapseWhen,
  defaultExpanded,
}: ToolModalSectionProps) {
  return (
    <ToolModalSection
      variant="practice"
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

export function CompositorConfigSection({
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
      variant="compositorConfig"
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
