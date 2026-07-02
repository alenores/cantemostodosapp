"use client";

import { X } from "lucide-react";

type ToolModalHeaderProps = {
  titleId: string;
  title: string;
  closeAriaLabel: string;
  onClose: () => void;
};

export function ToolModalHeader({
  titleId,
  title,
  closeAriaLabel,
  onClose,
}: ToolModalHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
      <div className="flex items-center gap-3">
        <h2
          id={titleId}
          className="min-w-0 flex-1 text-lg font-extrabold text-accent"
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label={closeAriaLabel}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
