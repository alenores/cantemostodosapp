"use client";

import {
  NOTACION_ACORDES_OPTIONS,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import {
  CIFRADO_NOTACION_LABEL_CLASS,
  CIFRADO_NOTACION_SEGMENTED_CLASS,
  NOTACION_TAB_LABEL,
  cifradoNotacionButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";

type CifradoNotacionToggleProps = {
  notacion: NotacionAcordes;
  onChange: (next: NotacionAcordes) => void;
  /** Dentro de un panel (p. ej. debajo del BPM). */
  embedded?: boolean;
};

export default function CifradoNotacionToggle({
  notacion,
  onChange,
  embedded = false,
}: CifradoNotacionToggleProps) {
  return (
    <div
      className={
        embedded
          ? "mt-3 border-t border-compositor-config-border/40 pt-3"
          : "rounded-[10px] border border-border/70 bg-bg-dark/60 px-2.5 py-2"
      }
    >
      <p className={CIFRADO_NOTACION_LABEL_CLASS}>Ver acordes como</p>
      <div
        className={CIFRADO_NOTACION_SEGMENTED_CLASS}
        role="tablist"
        aria-label="Ver acordes como"
      >
        {NOTACION_ACORDES_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={notacion === option.id}
            onClick={() => onChange(option.id)}
            className={cifradoNotacionButtonClass(notacion === option.id)}
          >
            {NOTACION_TAB_LABEL[option.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
