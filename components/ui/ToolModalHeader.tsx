"use client";

import { X, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type ToolModalHeaderProps = {
  titleId: string;
  title?: string;
  titleClassName?: string;
  headerContent?: ReactNode;
  closeAriaLabel: string;
  onClose: () => void;
  onBack?: () => void;
  backAriaLabel?: string;
  showClose?: boolean;
  density?: "default" | "compact";
  accentVar?: string;
  isPage?: boolean;
};

export function ToolModalHeader({
  titleId,
  title,
  titleClassName,
  headerContent,
  closeAriaLabel,
  onClose,
  onBack,
  backAriaLabel = "Volver",
  showClose = true,
  density = "default",
  accentVar,
  isPage = false,
}: ToolModalHeaderProps) {
  const isCompact = density === "compact";
  const isDesktop = useIsDesktop();
  const isPageDesktop = isPage && isDesktop;
  const isPageMobile = isPage && !isDesktop;

  return (
    <header
      className={`shrink-0 border-b border-border/80 bg-bg-dark px-4 ${
        isCompact ? "py-2 lg:py-2.5" : "py-2.5 lg:py-3"
      }`}
      style={{
        paddingTop: `calc(${isCompact ? "0.5rem" : "0.75rem"} + env(safe-area-inset-top, 0px))`,
      }}
    >
      <div
        className={`flex items-center gap-3 ${
          isCompact ? "min-h-9" : "min-h-11"
        }`}
      >
        {onBack ? (
          <button
            type="button"
            aria-label={backAriaLabel}
            onClick={onBack}
            className={`flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-card transition-all active:scale-95 ${
              isCompact ? "size-9" : "size-11"
            }`}
          >
            <ArrowLeft
              className={`text-text-primary ${isCompact ? "size-4" : "size-5"}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
        {headerContent ? (
          <div
            className="min-w-0 flex-1"
            style={accentVar ? { color: `var(${accentVar})` } : undefined}
          >
            {headerContent}
          </div>
        ) : (
          <h2
            id={titleId}
            className={`min-w-0 flex-1 text-lg font-extrabold tracking-tight ${
              titleClassName ?? (accentVar ? "" : "text-text-primary")
            }`}
            style={accentVar ? { color: `var(${accentVar})` } : undefined}
          >
            {title}
          </h2>
        )}
        {showClose ? (
          <button
            type="button"
            aria-label={closeAriaLabel}
            onClick={onClose}
            className={`flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-card transition-all active:scale-95 ${
              isCompact ? "size-9" : "size-11"
            }`}
          >
            <X
              className={`text-text-primary ${isCompact ? "size-4" : "size-5"}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </header>
  );
}
