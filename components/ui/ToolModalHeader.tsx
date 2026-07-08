"use client";

import { X, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

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
}: ToolModalHeaderProps) {
  const isCompact = density === "compact";

  return (
    <header
      className={`shrink-0 border-b border-border bg-bg-dark px-4 ${
        isCompact ? "py-1.5 lg:py-2" : "py-2.5 lg:py-3"
      }`}
    >
      <div
        className={`flex items-center gap-2.5 ${isCompact ? "min-h-9" : "min-h-11 gap-3"}`}
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
          <div className="min-w-0 flex-1">{headerContent}</div>
        ) : (
          <h2
            id={titleId}
            className={`min-w-0 flex-1 text-lg font-extrabold ${
              titleClassName ?? "text-accent"
            }`}
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
