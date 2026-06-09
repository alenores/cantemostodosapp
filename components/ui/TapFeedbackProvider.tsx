"use client";

import { triggerHaptic } from "@/lib/haptic";
import { useEffect, type ReactNode } from "react";

const TAP_TARGET_SELECTOR =
  "button:not(:disabled), a[href], [role='button']:not([aria-disabled='true'])";

const TAP_IGNORE_SELECTOR =
  "[data-no-tap-feedback], input, textarea, select, label";

function resolveTapTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest(TAP_IGNORE_SELECTOR)) {
    return null;
  }

  const tapTarget = target.closest(TAP_TARGET_SELECTOR);

  return tapTarget instanceof HTMLElement ? tapTarget : null;
}

export default function TapFeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    function clearPressed(element: HTMLElement) {
      element.classList.remove("is-tap-pressed");
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const tapTarget = resolveTapTarget(event.target);

      if (!tapTarget) {
        return;
      }

      triggerHaptic();
      tapTarget.classList.add("is-tap-pressed");

      const cleanup = () => clearPressed(tapTarget);

      tapTarget.addEventListener("pointerup", cleanup, { once: true });
      tapTarget.addEventListener("pointercancel", cleanup, { once: true });
      tapTarget.addEventListener("pointerleave", cleanup, { once: true });
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, []);

  return children;
}
