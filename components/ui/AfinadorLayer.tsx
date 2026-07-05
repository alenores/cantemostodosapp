"use client";

import AfinadorModal from "@/components/ui/AfinadorModal";
import { useAfinador } from "@/hooks/useAfinador";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useEffect } from "react";

export type AfinadorLayerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AfinadorLayer({
  open,
  onOpenChange,
}: AfinadorLayerProps) {
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
    if (!open) {
      stop();
      return;
    }

    if (micPermissionGranted) {
      void start();
    }
  }, [open, micPermissionGranted, start, stop]);

  useHardwareBack(open, () => {
    stop();
    onOpenChange(false);
  });

  const handleClose = () => {
    stop();
    onOpenChange(false);
  };

  return (
    <AfinadorModal
      open={open}
      detection={detection}
      micError={micError}
      micPermissionGranted={micPermissionGranted}
      micReady={micReady}
      micStarting={micStarting}
      onRequestMic={() => void start()}
      onClose={handleClose}
    />
  );
}
