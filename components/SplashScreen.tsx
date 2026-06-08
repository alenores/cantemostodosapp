"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFadeOut(true), 1200);
    const hideTimer = window.setTimeout(() => setVisible(false), 1500);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#232323] transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={fadeOut}
    >
      <Image
        src="/logo.svg"
        alt="CantemosTodos"
        width={160}
        height={160}
        priority
        className="size-40"
      />
    </div>
  );
}
