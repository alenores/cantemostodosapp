"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const MIN_VISIBLE_MS = 800;
const MAX_VISIBLE_MS = 5000;
const FADE_OUT_MS = 300;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let ready = document.readyState === "complete";
    let minElapsed = false;
    let dismissed = false;

    const dismiss = () => {
      if (dismissed || !ready || !minElapsed) {
        return;
      }

      dismissed = true;
      setFadeOut(true);
      window.setTimeout(() => setVisible(false), FADE_OUT_MS);
    };

    const minTimer = window.setTimeout(() => {
      minElapsed = true;
      dismiss();
    }, MIN_VISIBLE_MS);

    const maxTimer = window.setTimeout(() => {
      ready = true;
      dismiss();
    }, MAX_VISIBLE_MS);

    const onLoad = () => {
      ready = true;
      dismiss();
    };

    if (!ready) {
      window.addEventListener("load", onLoad);
    }

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#232323] transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
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

        <div className="splash-eq flex items-end justify-center gap-1.5" aria-hidden="true">
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
