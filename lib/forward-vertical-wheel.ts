import type { WheelEvent as ReactWheelEvent } from "react";

function shouldForwardVerticalWheel(
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "shiftKey">,
): boolean {
  return !event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX);
}

function canScrollVertically(element: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(element);

  if (
    overflowY !== "auto" &&
    overflowY !== "scroll" &&
    overflowY !== "overlay"
  ) {
    return false;
  }

  return element.scrollHeight - element.clientHeight > 0;
}

function findScrollableVerticalTarget(start: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start;

  while (node) {
    if (
      node.hasAttribute("data-tool-vertical-scroll") &&
      canScrollVertically(node)
    ) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

function wheelEventTargetElement(
  event: ReactWheelEvent<HTMLElement>,
): HTMLElement {
  const { target } = event.nativeEvent;

  if (target instanceof HTMLElement) {
    return target;
  }

  if (target instanceof Node && target.parentElement) {
    return target.parentElement;
  }

  return event.currentTarget;
}

/** Reenvía la rueda vertical al contenedor con `data-tool-vertical-scroll` más cercano que pueda desplazarse. */
export function forwardVerticalWheel(
  event: ReactWheelEvent<HTMLElement>,
): void {
  if (event.defaultPrevented || !shouldForwardVerticalWheel(event.nativeEvent)) {
    return;
  }

  const verticalScroller = findScrollableVerticalTarget(
    wheelEventTargetElement(event),
  );

  if (!verticalScroller) {
    return;
  }

  const maxScrollTop =
    verticalScroller.scrollHeight - verticalScroller.clientHeight;
  const { scrollTop } = verticalScroller;
  const nextScrollTop = scrollTop + event.deltaY;

  if (nextScrollTop < 0 || nextScrollTop > maxScrollTop) {
    return;
  }

  verticalScroller.scrollTop = nextScrollTop;
  event.preventDefault();
}
