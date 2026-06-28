"use client";

import {
  APP_READY_EVENT,
  APP_SHELL_BG,
  SPLASH_FADE_OUT_MS,
  SPLASH_MAX_VISIBLE_MS,
  SPLASH_MIN_VISIBLE_MS,
} from "@/lib/splash-theme";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const INLINE_SPLASH_ID = "inline-splash";

/** Oculta el splash del layout sin sacarlo del DOM (remove() rompe la reconciliación de React). */
function hideInlineSplash() {
  const inlineSplash = document.getElementById(INLINE_SPLASH_ID);

  if (!inlineSplash) {
    return;
  }

  inlineSplash.style.display = "none";
  inlineSplash.setAttribute("aria-hidden", "true");
}

function isSettledRoute(pathname: string): boolean {
  return pathname !== "";
}

export default function SplashScreen() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    hideInlineSplash();
    document.documentElement.classList.add("splash-active");

    return () => {
      document.documentElement.classList.remove("splash-active");
    };
  }, []);

  useEffect(() => {
    let dismissed = false;
    let minElapsed = false;
    let appReady = false;

    const dismiss = () => {
      if (dismissed || !minElapsed || !appReady || !isSettledRoute(pathname)) {
        return;
      }

      dismissed = true;
      setFadeOut(true);
      window.setTimeout(() => {
        setVisible(false);
        document.documentElement.classList.remove("splash-active");
      }, SPLASH_FADE_OUT_MS);
    };

    const onAppReady = () => {
      appReady = true;
      dismiss();
    };

    const minTimer = window.setTimeout(() => {
      minElapsed = true;
      dismiss();
    }, SPLASH_MIN_VISIBLE_MS);

    const maxTimer = window.setTimeout(() => {
      appReady = true;
      minElapsed = true;
      dismiss();
    }, SPLASH_MAX_VISIBLE_MS);

    window.addEventListener(APP_READY_EVENT, onAppReady);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener(APP_READY_EVENT, onAppReady);
    };
  }, [pathname]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: APP_SHELL_BG }}
      role="status"
      aria-live="polite"
      aria-label="Cargando CantemosTodos"
      aria-hidden={fadeOut}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="splash-logo-wrap relative flex items-center justify-center">
          <div className="splash-glow" aria-hidden="true" />
          <Image
            src="/logo.svg"
            alt="CantemosTodos"
            width={160}
            height={160}
            priority
            className="splash-logo relative z-10 size-40"
          />
        </div>

        <div
          className="splash-eq flex items-end justify-center gap-1.5"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="splash-eq-bar"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-accent/20"
        aria-hidden="true"
      >
        <div className="splash-progress-bar h-full w-1/3 bg-accent" />
      </div>
    </div>
  );
}
