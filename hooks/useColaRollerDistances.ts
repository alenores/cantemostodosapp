"use client";

import type { ColaCenterDistance } from "@/lib/cola-roller";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const SCROLL_TOP_CALIBRATION_PX = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distancesChanged(
  previous: Record<number, ColaCenterDistance>,
  next: Record<number, ColaCenterDistance>,
): boolean {
  const keys = new Set([
    ...Object.keys(previous).map(Number),
    ...Object.keys(next).map(Number),
  ]);

  for (const key of keys) {
    if (Math.abs((previous[key] ?? 0) - (next[key] ?? 0)) > 0.015) {
      return true;
    }
  }

  return false;
}

function measureRowSpan(
  rowRefs: (HTMLElement | null)[],
  activeIndex: number,
): number {
  if (activeIndex > 0 && rowRefs[activeIndex] && rowRefs[activeIndex - 1]) {
    const current = rowRefs[activeIndex]!.getBoundingClientRect();
    const previous = rowRefs[activeIndex - 1]!.getBoundingClientRect();

    return Math.max(52, current.top - previous.top);
  }

  if (rowRefs[activeIndex]) {
    return Math.max(52, rowRefs[activeIndex]!.getBoundingClientRect().height + 8);
  }

  return 64;
}

export function useColaRollerDistances(
  itemCount: number,
  activeIndex: number,
  scrollRef: RefObject<HTMLDivElement | null>,
  refreshKey: unknown,
) {
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);
  /** Punto focal fijo en pantalla: calibrado en la canción activa con scroll arriba. */
  const focalCenterYRef = useRef<number | null>(null);
  const [distances, setDistances] = useState<Record<number, ColaCenterDistance>>(
    {},
  );

  const setRowRef = useCallback((index: number, element: HTMLElement | null) => {
    rowRefs.current[index] = element;
  }, []);

  const updateDistances = useCallback(() => {
    const container = scrollRef.current;

    if (!container || itemCount === 0) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    if (containerRect.height <= 0) {
      return;
    }

    const containerCenter = containerRect.top + containerRect.height / 2;
    const halfHeight = containerRect.height / 2;
    const scrollTop = container.scrollTop;
    const activeRow =
      activeIndex >= 0 ? rowRefs.current[activeIndex] : null;
    const activeRect = activeRow?.getBoundingClientRect();

    if (scrollTop <= SCROLL_TOP_CALIBRATION_PX && activeRect) {
      focalCenterYRef.current = activeRect.top + activeRect.height / 2;
    } else if (focalCenterYRef.current === null) {
      const rowSpan = measureRowSpan(rowRefs.current, activeIndex);
      focalCenterYRef.current = containerCenter - rowSpan * 0.85;
    }

    const focalCenterY = focalCenterYRef.current ?? containerCenter;
    const next: Record<number, ColaCenterDistance> = {};

    for (let index = 0; index < itemCount; index += 1) {
      const row = rowRefs.current[index];

      if (!row) {
        continue;
      }

      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.top + rowRect.height / 2;

      next[index] = clamp((rowCenter - focalCenterY) / halfHeight, -1, 1);
    }

    setDistances((previous) =>
      distancesChanged(previous, next) ? next : previous,
    );
  }, [activeIndex, itemCount, scrollRef]);

  const scheduleUpdate = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      updateDistances();
    });
  }, [updateDistances]);

  useEffect(() => {
    focalCenterYRef.current = null;
    rowRefs.current.length = itemCount;
    scheduleUpdate();
  }, [itemCount, refreshKey, scheduleUpdate]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(container);

    scheduleUpdate();

    return () => {
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver.disconnect();

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scrollRef, scheduleUpdate, itemCount]);

  return { distances, setRowRef, scheduleUpdate };
}
