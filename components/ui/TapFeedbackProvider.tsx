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
    let pressedElement: HTMLElement | null = null;

    function clearPressed() {
      if (!pressedElement) {
        return;
      }

      pressedElement.classList.remove("is-tap-pressed");
      pressedElement = null;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const tapTarget = resolveTapTarget(event.target);

      if (!tapTarget) {
        return;
      }

      clearPressed();
      triggerHaptic();
      pressedElement = tapTarget;
      tapTarget.classList.add("is-tap-pressed");
    }

    function onPointerEnd() {
      clearPressed();
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("pointerup", onPointerEnd, { capture: true });
    document.addEventListener("pointercancel", onPointerEnd, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointerup", onPointerEnd, { capture: true });
      document.removeEventListener("pointercancel", onPointerEnd, {
        capture: true,
      });
      clearPressed();
    };
  }, []);

  return children;
}
