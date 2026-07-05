"use client";

import { CompositorOptionCarousel } from "@/components/ui/compositor/CompositorSlotDetail";
import { CompasNumericCarousel } from "@/components/ui/ToolRitmoConfig";
import type { NotaIndex } from "@/lib/cifrado";
import type { CompositorInstrumentId } from "@/lib/compositor";
import {
  clampGradoCromatico,
  clampMelodicOctaveForInstrument,
  COMPOSITOR_GRADO_OPTIONS,
  formatCompositorGradoResolvedLabel,
  type CompositorGradoCromatico,
} from "@/lib/compositor-melodic-pitch";
import { RITMO_LABEL_NOTA } from "@/lib/ritmo-terminologia";

type GradoOptionId = `${CompositorGradoCromatico}`;

export type CompositorGradoPickerProps = {
  gradoCromatico: number;
  octavaRelativa: number;
  tonalidadComposicion: NotaIndex;
  instrumentId: CompositorInstrumentId;
  disabled?: boolean;
  onGradoChange: (grado: CompositorGradoCromatico) => void;
  onOctavaChange: (octava: number) => void;
};

const GRADO_CAROUSEL_OPTIONS = COMPOSITOR_GRADO_OPTIONS.map((option) => ({
  id: String(option.id) as GradoOptionId,
  label: option.label,
}));

export function CompositorGradoPicker({
  gradoCromatico,
  octavaRelativa,
  tonalidadComposicion,
  instrumentId,
  disabled = false,
  onGradoChange,
  onOctavaChange,
}: CompositorGradoPickerProps) {
  const grado = clampGradoCromatico(gradoCromatico);
  const octava = clampMelodicOctaveForInstrument(octavaRelativa, instrumentId);
  const minOctave =
    instrumentId === "guitarra" ? 2 : instrumentId === "viento" ? 4 : 3;
  const maxOctave = instrumentId === "viento" ? 5 : minOctave + 1;

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-compositor-config">
          {RITMO_LABEL_NOTA} (1–12)
        </p>
        <CompositorOptionCarousel
          options={GRADO_CAROUSEL_OPTIONS}
          value={String(grado) as GradoOptionId}
          disabled={disabled}
          onChange={(value) =>
            onGradoChange(clampGradoCromatico(Number(value)))
          }
          decrementAriaLabel="Grado anterior"
          incrementAriaLabel="Grado siguiente"
        />
      </div>

      <CompasNumericCarousel
        value={octava}
        disabled={disabled}
        decrementDisabled={octava <= minOctave}
        incrementDisabled={octava >= maxOctave}
        decrementAriaLabel="Octava anterior"
        incrementAriaLabel="Octava siguiente"
        valueAriaLabel={`Octava ${octava}`}
        primaryLabel="octava"
        secondaryLabel={`${minOctave}–${maxOctave}`}
        onDecrement={() => onOctavaChange(Math.max(minOctave, octava - 1))}
        onIncrement={() => onOctavaChange(Math.min(maxOctave, octava + 1))}
      />

      <p className="text-[11px] leading-snug text-text-muted">
        {formatCompositorGradoResolvedLabel(
          { gradoCromatico: grado, octavaRelativa: octava },
          tonalidadComposicion,
        )}
      </p>
    </div>
  );
}
