"use client";

import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ToolPresentationRootProps = {
  presentation?: ToolPresentation;
  open: boolean;
  onClose: () => void;
  closeAriaLabel: string;
  panelClassName: string;
  children: ReactNode;
  trailing?: ReactNode;
};

export function ToolPresentationRoot({
  presentation = "modal",
  open,
  onClose,
  closeAriaLabel,
  panelClassName,
  children,
  trailing = null,
}: ToolPresentationRootProps) {
  const isPage = isToolPagePresentation(presentation);

  if (!open && !isPage) {
    return null;
  }

  const panel = (
    <div
      role={isPage ? undefined : "dialog"}
      aria-modal={isPage ? undefined : true}
      className={
        isPage
          ? `flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app ${panelClassName}`
          : panelClassName
      }
    >
      {children}
    </div>
  );

  if (isPage) {
    return (
      <>
        {panel}
        {trailing}
      </>
    );
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
        <button
          type="button"
          aria-label={closeAriaLabel}
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />
        {panel}
      </div>
      {trailing}
    </>,
    document.body,
  );
}
