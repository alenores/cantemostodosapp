"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const OVERSCAN_ROWS = 4;
const FALLBACK_ROW_PX = 156;

function columnCount() {
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

function rowGap() {
  return window.innerWidth >= 1024 ? 14 : 12;
}

type CancioneroVirtualGridProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
};

/**
 * Dibuja solo las tarjetas que entran en la pantalla (y unas pocas de más).
 * El resto queda como espacio vacío hasta que la persona hace scroll.
 */
export default function CancioneroVirtualGrid<T>({
  items,
  getKey,
  renderItem,
}: CancioneroVirtualGridProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const rowStrideRef = useRef(FALLBACK_ROW_PX);
  const [windowed, setWindowed] = useState({
    start: 0,
    end: 24,
    top: 0,
    bottom: 0,
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || items.length === 0) return;
    const list = root;

    function update() {
      const probe = probeRef.current;
      if (probe && probe.offsetHeight > 0) {
        rowStrideRef.current = probe.offsetHeight + rowGap();
      }

      const columns = columnCount();
      const stride = rowStrideRef.current;
      const into = Math.max(0, -list.getBoundingClientRect().top);
      const viewBottom = into + window.innerHeight;
      const rowCount = Math.max(1, Math.ceil(items.length / columns));
      const startRow = Math.max(0, Math.floor(into / stride) - OVERSCAN_ROWS);
      const endRow = Math.min(
        rowCount - 1,
        Math.max(startRow, Math.ceil(viewBottom / stride) + OVERSCAN_ROWS),
      );
      const start = startRow * columns;
      const end = Math.min(items.length, (endRow + 1) * columns);
      const top = startRow * stride;
      const bottom = Math.max(0, (rowCount - endRow - 1) * stride);

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
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  const visible = items.slice(windowed.start, windowed.end);

  return (
    <div ref={rootRef}>
      {windowed.top > 0 ? (
        <div style={{ height: windowed.top }} aria-hidden="true" />
      ) : null}
      <div className="app-list-grid">
        {visible.map((item, offset) => {
          const index = windowed.start + offset;
          return (
            <div key={getKey(item)} ref={index === 0 ? probeRef : undefined}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
      {windowed.bottom > 0 ? (
        <div style={{ height: windowed.bottom }} aria-hidden="true" />
      ) : null}
    </div>
  );
}
