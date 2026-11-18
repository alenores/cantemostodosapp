"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const OVERSCAN = 4;
const FALLBACK_ROW_PX = 68;
const FALLBACK_GAP_PX = 8;

function scrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const overflow = getComputedStyle(current).overflowY;
    if (overflow === "auto" || overflow === "scroll") return current;
    current = current.parentElement;
  }
  return null;
}

type BuscadorListaVirtualProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  /** Cambia cuando la lista es otra (por ejemplo, al escribir en el buscador). */
  revision: string;
  renderItem: (item: T, index: number) => ReactNode;
  getItemClassName?: (item: T, index: number) => string | undefined;
  getItemStyle?: (item: T, index: number) => CSSProperties | undefined;
};

/**
 * Dibuja solo las filas que entran en la ventana del buscador (y unas pocas de más).
 * El resto queda como espacio vacío hasta que la persona hace scroll.
 */
export default function BuscadorListaVirtual<T>({
  items,
  getKey,
  revision,
  renderItem,
  getItemClassName,
  getItemStyle,
}: BuscadorListaVirtualProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLLIElement>(null);
  const strideRef = useRef(FALLBACK_ROW_PX + FALLBACK_GAP_PX);
  const [windowed, setWindowed] = useState({
    start: 0,
    end: 24,
    top: 0,
    bottom: 0,
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || items.length === 0) return;
    const scroller = scrollParent(root);
    if (scroller) scroller.scrollTop = 0;

    function update() {
      const list = root!.querySelector("ul");
      const gap = list
        ? parseFloat(getComputedStyle(list).rowGap) || FALLBACK_GAP_PX
        : FALLBACK_GAP_PX;
      const probe = probeRef.current;
      if (probe && probe.offsetHeight > 0) {
        strideRef.current = probe.offsetHeight + gap;
      }

      const stride = strideRef.current;
      const listRect = root!.getBoundingClientRect();
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const viewHeight = scroller ? scroller.clientHeight : window.innerHeight;
      const into = Math.max(0, viewTop - listRect.top);
      const viewBottom = into + viewHeight;
      const start = Math.max(0, Math.floor(into / stride) - OVERSCAN);
      const end = Math.min(
        items.length,
        Math.max(start + 1, Math.ceil(viewBottom / stride) + OVERSCAN),
      );
      const top = start * stride;
      const bottom = Math.max(0, (items.length - end) * stride);

      setWindowed((prev) =>
        prev.start === start &&
        prev.end === end &&
        prev.top === top &&
        prev.bottom === bottom
          ? prev
          : { start, end, top, bottom },
      );
    }

    update();
    const onScroll = () => update();
    if (scroller) scroller.addEventListener("scroll", onScroll, { passive: true });
    else window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (scroller) scroller.removeEventListener("scroll", onScroll);
      else window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items.length, revision]);

  if (items.length === 0) return null;

  const visible = items.slice(windowed.start, windowed.end);

  return (
    <div ref={rootRef}>
      {windowed.top > 0 ? (
        <div style={{ height: windowed.top }} aria-hidden="true" />
      ) : null}
      <ul className="flex flex-col gap-2">
        {visible.map((item, offset) => {
          const index = windowed.start + offset;
          return (
            <li
              key={getKey(item)}
              ref={index === 0 ? probeRef : undefined}
              className={getItemClassName?.(item, index)}
              style={getItemStyle?.(item, index)}
            >
              {renderItem(item, index)}
            </li>
          );
        })}
      </ul>
      {windowed.bottom > 0 ? (
        <div style={{ height: windowed.bottom }} aria-hidden="true" />
      ) : null}
    </div>
  );
}
