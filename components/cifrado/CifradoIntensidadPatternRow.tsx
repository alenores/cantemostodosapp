"use client";



import {

  CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS,

  CIFRADO_INTENSIDAD_PATTERN_CLASS,

  CIFRADO_INTENSIDAD_PATTERN_FLUID_CLASS,

} from "@/components/cifrado/cifrado-controls-ui";

import { TapButton } from "@/components/ui/TapFeedback";

import {

  getActivePatternSlice,

  getBeatLevelBarAppearance,

  getBeatLevelBarHeightPercent,

  getBeatLevelLabel,

  type MetronomeBeatLevel,

} from "@/lib/metronomo";



type CifradoIntensidadPatternRowProps = {

  pattern: MetronomeBeatLevel[];

  disabled?: boolean;

  onCycleSlot: (slotIndex: number) => void;

  onClearSelection?: () => void;

  showClearSelection?: boolean;

  /** Ocupa el ancho disponible sin empujar elementos vecinos. */
  fluid?: boolean;

};



export default function CifradoIntensidadPatternRow({

  pattern,

  disabled = false,

  onCycleSlot,

  onClearSelection,

  showClearSelection = false,

  fluid = false,

}: CifradoIntensidadPatternRowProps) {

  const activePattern = getActivePatternSlice(pattern, pattern.length);



  return (

    <div className={`flex items-end gap-2 ${fluid ? "min-w-0 w-full" : ""}`}>

      {showClearSelection && onClearSelection ? (

        <button

          type="button"

          onClick={onClearSelection}

          className={`mb-1 shrink-0 text-[9px] font-medium underline-offset-2 hover:underline ${CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS}`}

        >

          Modelo

        </button>

      ) : null}

      <div

        className={
          fluid ? CIFRADO_INTENSIDAD_PATTERN_FLUID_CLASS : CIFRADO_INTENSIDAD_PATTERN_CLASS
        }

        role="group"

        aria-label="Intensidad por golpe"

      >

        {activePattern.map((level, index) => {

          const heightPercent = Math.max(

            getBeatLevelBarHeightPercent(level),

            level === "silencio" ? 0 : 8,

          );

          const barAppearance = getBeatLevelBarAppearance(level);



          return (

            <TapButton

              key={`cifrado-intensidad-${index}`}

              type="button"

              disabled={disabled}

              onClick={() => onCycleSlot(index)}

              aria-label={`Golpe ${index + 1}: ${getBeatLevelLabel(level)}`}

              className={`flex h-9 min-w-0 flex-1 flex-col items-center justify-end gap-0.5 disabled:opacity-50 ${
                fluid ? "w-auto" : "w-6 sm:w-7"
              }`}

              title={`Golpe ${index + 1}: ${getBeatLevelLabel(level)}`}

            >

              <span

                className="w-full rounded-full"

                style={{

                  height: `${Math.max(heightPercent * 0.2, level === "silencio" ? 3 : 7)}px`,

                  backgroundColor: barAppearance.backgroundColor,

                  border: barAppearance.border,

                }}

              />

              <span className="text-[8px] font-bold leading-none text-text-muted">

                {index + 1}

              </span>

            </TapButton>

          );

        })}

      </div>

    </div>

  );

}


