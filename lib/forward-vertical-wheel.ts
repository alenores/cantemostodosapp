import type { WheelEvent as ReactWheelEvent } from "react";

function shouldForwardVerticalWheel(
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey">,
): boolean {
  return !event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX);
}

/** Reenvía la rueda vertical al contenedor con `data-tool-vertical-scroll`. */
export function forwardVerticalWheel(
  event: ReactWheelEvent<HTMLElement>,
): void {
  if (!shouldForwardVerticalWheel(event.nativeEvent)) {
    return;
  }

  const verticalScroller = event.currentTarget.closest(
    "[data-tool-vertical-scroll]",
  );

  if (!(verticalScroller instanceof HTMLElement)) {
    return;
  }

  const maxScrollTop = verticalScroller.scrollHeight - verticalScroller.clientHeight;

  if (maxScrollTop <= 0) {
    return;
  }

  const { scrollTop } = verticalScroller;
  const nextScrollTop = scrollTop + event.deltaY;

  if (nextScrollTop < 0 || nextScrollTop > maxScrollTop) {
    return;
  }

  verticalScroller.scrollTop = nextScrollTop;
  event.preventDefault();
}
