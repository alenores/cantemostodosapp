"use client";

import { X, ArrowLeft } from "lucide-react";

type ToolModalHeaderProps = {
  titleId: string;
  title: string;
  closeAriaLabel: string;
  onClose: () => void;
  onBack?: () => void;
  backAriaLabel?: string;
  showClose?: boolean;
};

export function ToolModalHeader({
  titleId,
  title,
  closeAriaLabel,
  onClose,
  onBack,
  backAriaLabel = "Volver",
  showClose = true,
}: ToolModalHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            aria-label={backAriaLabel}
            onClick={onBack}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </button>
        ) : null}
        <h2
          id={titleId}
          className="min-w-0 flex-1 text-lg font-extrabold text-accent"
        >
          {title}
        </h2>
        {showClose ? (
          <button
            type="button"
            aria-label={closeAriaLabel}
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-5 text-text-primary" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </header>
  );
}
