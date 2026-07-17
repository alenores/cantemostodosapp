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

  return (
    <header
      className={
        isPageDesktop
          ? "shrink-0 border-none bg-transparent px-4 lg:px-6 pt-4 lg:pt-6 pb-1 [&_h2]:text-2xl [&_h2]:lg:text-[1.75rem] [&_h2]:tracking-tight [&_h2]:font-extrabold"
          : `shrink-0 border-b border-border bg-bg-dark px-4 ${
              isCompact ? "pb-1.5 lg:pb-2" : "pb-2.5 lg:pb-3"
            }`
      }
      style={
        isPageDesktop
          ? undefined
          : {
              paddingTop: isCompact
                ? "calc(0.375rem + env(safe-area-inset-top, 0px))"
                : "calc(0.625rem + env(safe-area-inset-top, 0px))",
            }
      }
    >
      <div
        className={
          isPageDesktop
            ? "flex items-center gap-2.5 min-h-9"
            : `flex items-center gap-2.5 ${isCompact ? "min-h-9" : "min-h-11 gap-3"}`
        }
      >
        {onBack ? (
          <button
            type="button"
            aria-label={backAriaLabel}
            onClick={onBack}
            className={`flex shrink-0 items-center justify-center rounded-full bg-bg-card ${
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
            className={`min-w-0 flex-1 text-lg font-extrabold ${
              titleClassName ?? "text-accent"
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
            className={`flex shrink-0 items-center justify-center rounded-full bg-bg-card ${
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
