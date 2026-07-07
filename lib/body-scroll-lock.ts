type BodyScrollSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
};

let lockCount = 0;
let savedScrollX = 0;
let savedScrollY = 0;
let savedBodyStyles: BodyScrollSnapshot | null = null;
let savedHtmlOverflow = "";

function captureBodyStyles(): BodyScrollSnapshot {
  const { style } = document.body;

  return {
    overflow: style.overflow,
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
  };
}

function applyBodyStyles(styles: BodyScrollSnapshot) {
  const { style } = document.body;
  style.overflow = styles.overflow;
  style.position = styles.position;
  style.top = styles.top;
  style.left = styles.left;
  style.right = styles.right;
  style.width = styles.width;
}

function lockBodyScroll() {
  if (lockCount > 0) {
    lockCount += 1;
    return;
  }

  savedScrollX = window.scrollX;
  savedScrollY = window.scrollY;
  savedBodyStyles = captureBodyStyles();
  savedHtmlOverflow = document.documentElement.style.overflow;

  const { style } = document.body;
  document.documentElement.style.overflow = "hidden";
  style.overflow = "hidden";
  style.position = "fixed";
  style.top = `-${savedScrollY}px`;
  style.left = `-${savedScrollX}px`;
  style.right = "0";
  style.width = "100%";

  lockCount = 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount > 0 || !savedBodyStyles) {
    return;
  }

  applyBodyStyles(savedBodyStyles);
  document.documentElement.style.overflow = savedHtmlOverflow;
  savedBodyStyles = null;
  savedHtmlOverflow = "";
  window.scrollTo(savedScrollX, savedScrollY);
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
