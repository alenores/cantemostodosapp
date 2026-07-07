"use client";

import AfinadorModal from "@/components/ui/AfinadorModal";
import { useAfinador } from "@/hooks/useAfinador";
import { useEffect } from "react";

export default function AfinadorPageClient() {
  const {
    detection,
    micError,
    micPermissionGranted,
    micReady,
    micStarting,
    start,
    stop,
  } = useAfinador();

  useEffect(() => {
    if (micPermissionGranted) {
      void start();
    }

    return () => {
      stop();
    };
  }, [micPermissionGranted, start, stop]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AfinadorModal
        open
        presentation="page"
        detection={detection}
        micError={micError}
        micPermissionGranted={micPermissionGranted}
        micReady={micReady}
        micStarting={micStarting}
        onRequestMic={() => void start()}
        onClose={() => {}}
      />
    </div>
  );
}
