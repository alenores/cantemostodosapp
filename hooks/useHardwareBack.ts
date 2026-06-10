"use client";

import { useEffect, useId, useRef } from "react";

type StackEntry = {
  id: string;
  onBack: () => void;
};

const stack: StackEntry[] = [];
const consumedIds = new Set<string>();
let listenerReady = false;
let suppressNextPop = false;

function handlePopState(event: PopStateEvent) {
  if (suppressNextPop) {
    suppressNextPop = false;
    // Evita que Next.js interprete el history.back() de cleanup como navegación.
    event.stopImmediatePropagation();
    return;
  }

  const entry = stack.pop();

  if (!entry) {
    return;
  }

  consumedIds.add(entry.id);
  entry.onBack();
}

function ensureListener() {
  if (listenerReady) {
    return;
  }

  listenerReady = true;
  window.addEventListener("popstate", handlePopState, { capture: true });
}

/**
 * Intercepta el botón atrás físico del celular mientras `enabled` es true.
 * Apila entradas en history para que cada capa (modal, cola, etc.) cierre en orden.
 */
export function useHardwareBack(enabled: boolean, onBack: () => void) {
  const id = useId();
  const onBackRef = useRef(onBack);
  const pushedRef = useRef(false);

  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    ensureListener();

    const entry: StackEntry = {
      id,
      onBack: () => onBackRef.current(),
    };

    stack.push(entry);
    window.history.pushState({ hardwareBack: id }, "");
    pushedRef.current = true;

    return () => {
      const index = stack.findIndex((item) => item.id === id);

      if (index >= 0) {
        stack.splice(index, 1);
      }

      if (pushedRef.current && !consumedIds.has(id)) {
        pushedRef.current = false;
        suppressNextPop = true;
        window.history.back();
      }

      consumedIds.delete(id);
    };
  }, [enabled, id]);
}
