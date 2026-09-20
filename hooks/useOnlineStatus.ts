"use client";

import { useEffect, useState } from "react";

function readNavigatorOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useOnlineStatus(): boolean {
  // El primer render coincide con el servidor; el efecto lee la conexión real al montar.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function syncOnlineStatus() {
      setOnline(readNavigatorOnline());
    }

    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    syncOnlineStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", syncOnlineStatus);
    document.addEventListener("visibilitychange", syncOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", syncOnlineStatus);
      document.removeEventListener("visibilitychange", syncOnlineStatus);
    };
  }, []);

  return online;
}
