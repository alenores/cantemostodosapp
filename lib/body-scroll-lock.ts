let lockCount = 0;
let savedHtmlOverflow = "";
let savedBodyOverflow = "";
let escuchando = false;

function puedeDeslizarAdentro(origen: EventTarget | null): boolean {
  let nodo = origen instanceof Element ? origen : null;

  while (nodo && nodo !== document.body && nodo !== document.documentElement) {
    if (nodo instanceof HTMLElement) {
      const desborde = getComputedStyle(nodo).overflowY;
      const admite =
        desborde === "auto" || desborde === "scroll" || desborde === "overlay";
      if (admite && nodo.scrollHeight > nodo.clientHeight + 1) {
        return true;
      }
    }
    nodo = nodo.parentElement;
  }

  return false;
}

function frenarToqueDeFondo(evento: TouchEvent) {
  if (lockCount <= 0 || evento.touches.length !== 1) {
    return;
  }

  if (puedeDeslizarAdentro(evento.target)) {
    return;
  }

  if (evento.cancelable) {
    evento.preventDefault();
  }
}

function lockBodyScroll() {
  if (lockCount > 0) {
    lockCount += 1;
    return;
  }

  savedHtmlOverflow = document.documentElement.style.overflow;
  savedBodyOverflow = document.body.style.overflow;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.addEventListener("touchmove", frenarToqueDeFondo, { passive: false });
  escuchando = true;
  lockCount = 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount > 0) {
    return;
  }

  document.documentElement.style.overflow = savedHtmlOverflow;
  document.body.style.overflow = savedBodyOverflow;
  savedHtmlOverflow = "";
  savedBodyOverflow = "";

  if (escuchando) {
    document.removeEventListener("touchmove", frenarToqueDeFondo);
    escuchando = false;
  }
}

/** Bloquea el scroll del documento; devuelve una función para liberarlo. */
export function acquireBodyScrollLock(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  lockBodyScroll();

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    unlockBodyScroll();
  };
}
