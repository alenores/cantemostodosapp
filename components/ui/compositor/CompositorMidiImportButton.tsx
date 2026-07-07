"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { MIDI_IMPORT_ACCEPT } from "@/lib/compositor-midi";
import { COMPOSITOR_LABEL_IMPORTAR_MIDI } from "@/lib/ritmo-terminologia";
import { FileMusic } from "lucide-react";
import { useRef } from "react";

type CompositorMidiImportButtonProps = {
  disabled?: boolean;
  busy?: boolean;
  onPickFile: (file: File) => void | Promise<void>;
};

export function CompositorMidiImportButton({
  disabled = false,
  busy = false,
  onPickFile,
}: CompositorMidiImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <TapButton
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-compositor-config/35 bg-compositor-config/10 px-2.5 py-1 text-[11px] font-bold text-compositor-config disabled:opacity-40"
      >
        <FileMusic className="size-3.5" aria-hidden="true" />
        {COMPOSITOR_LABEL_IMPORTAR_MIDI}
      </TapButton>
      <input
        ref={inputRef}
        type="file"
        accept={MIDI_IMPORT_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            void onPickFile(file);
          }
        }}
      />
    </>
  );
}
