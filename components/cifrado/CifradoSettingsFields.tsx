"use client";

import CifradoNotacionToggle from "@/components/cifrado/CifradoNotacionToggle";
import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_PANEL_BOX_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import { type NotacionAcordes } from "@/lib/notacion-acordes";

export type CifradoSettingsFieldsProps = {
  idPrefix?: string;
  showCompas: boolean;
  notacion: NotacionAcordes;
  tonalidadIndex: NotaIndex;
  modoTonal: ModoTonal;
  bpm: number;
  tapCount: number;
  onNotacionChange: (next: NotacionAcordes) => void;
  onTonalidadChange: (next: NotaIndex) => void;
  onModoTonalChange: (next: ModoTonal) => void;
  onBpmChange: (next: number) => void;
  onTapTempo: () => void;
};

export default function CifradoSettingsFields({
  idPrefix = "cifrado-viewer",
  showCompas,
  notacion,
  tonalidadIndex,
  modoTonal,
  bpm,
  tapCount,
  onNotacionChange,
  onTonalidadChange,
  onModoTonalChange,
  onBpmChange,
  onTapTempo,
}: CifradoSettingsFieldsProps) {
  const showTonalidad = notacion !== "numero";

  return (
    <div className="space-y-4">
      {showTonalidad ? (
        <CifradoTonalidadFields
          idPrefix={idPrefix}
          notacion={notacion}
          tonalidadIndex={tonalidadIndex}
          modoTonal={modoTonal}
          onTonalidadChange={onTonalidadChange}
          onModoTonalChange={onModoTonalChange}
        />
      ) : null}

      {showCompas ? (
        <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
          <label
            className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
            htmlFor={`${idPrefix}-bpm`}
          >
            BPM
          </label>
          <div className="flex gap-2">
            <input
              id={`${idPrefix}-bpm`}
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(event) =>
                onBpmChange(Number(event.target.value) || bpm)
              }
              className={`${CIFRADO_CONTROLS_INPUT_CLASS} min-w-0 flex-1 text-center`}
            />
            <TapButton
              type="button"
              onClick={onTapTempo}
              className="min-w-[5.25rem] shrink-0 rounded-[10px] border border-border bg-bg-card px-4 text-xs font-semibold text-text-secondary"
            >
              Tap{tapCount > 0 ? ` (${tapCount})` : ""}
            </TapButton>
          </div>
          <CifradoNotacionToggle
            notacion={notacion}
            onChange={onNotacionChange}
            embedded
          />
        </div>
      ) : (
        <CifradoNotacionToggle notacion={notacion} onChange={onNotacionChange} />
      )}
    </div>
  );
}
