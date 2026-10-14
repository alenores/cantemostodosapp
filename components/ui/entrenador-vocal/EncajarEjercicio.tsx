"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { TargetPickerBody } from "@/components/ui/entrenador-vocal/EntrenadorVocalShared";
import { PanelDesdeAbajo } from "@/components/ui/entrenador-vocal/PanelDesdeAbajo";
import type { VozAccuracy, VozInstantAttempt, VozTarget } from "@/lib/voz";
import {
  centsToLadderPercent,
  formatTargetLabel,
  getLadderNoteSlots,
  getVozAccuracyColor,
  semitoneOffsetToLadderPercent,
  VOZ_INSTANT_ATTEMPTS_MAX,
  VOZ_INTUNE_CENTS,
  VOZ_LADDER_SEMITONE_SPAN,
} from "@/lib/voz";
import { hasAudiblePitchVolume } from "@/lib/voz-intensidad";
import { Mic, MicOff } from "lucide-react";
import "./encajar-ejercicio.css";

type EncajarEjercicioProps = {
  layout: "mobile" | "desktop";
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  disabled?: boolean;
  practiceActive: boolean;
  onTogglePractice: () => void;
  micStarting: boolean;
  targetNote: string;
  cents: number;
  accuracy: VozAccuracy;
  detectedNote: string | null;
  voiceRms: number;
  attempts: VozInstantAttempt[];
};

function puntoClase(result: VozInstantAttempt["result"]): string {
  switch (result) {
    case "en-tono":
      return "encajar-punto encajar-punto--bien";
    case "cerca":
      return "encajar-punto encajar-punto--cerca";
    default:
      return "encajar-punto encajar-punto--lejos";
  }
}

export function EncajarEjercicio({
  layout,
  target,
  onSetTarget,
  disabled = false,
  practiceActive,
  onTogglePractice,
  micStarting,
  targetNote,
  cents,
  accuracy,
  detectedNote,
  voiceRms,
  attempts,
}: EncajarEjercicioProps) {
  const slots = getLadderNoteSlots(targetNote);
  const markerLeft = centsToLadderPercent(cents);
  const zonaAncho = (VOZ_INTUNE_CENTS / (VOZ_LADDER_SEMITONE_SPAN * 100)) * 100;
  const hayVoz = accuracy !== "silencio" && hasAudiblePitchVolume(voiceRms);
  const intentos = Array.from({ length: VOZ_INSTANT_ATTEMPTS_MAX }, (_, index) => {
    return attempts[index] ?? null;
  });

  const notas = (
    <div className="encajar-notas">
      <TargetPickerBody
        target={target}
        onSetTarget={onSetTarget}
        disabled={disabled}
        appearance="plain"
      />
    </div>
  );

  const practica = (
      <section className="encajar-panel encajar-panel--practica">
        <div className="encajar-practica-cabeza">
          <h3 className="encajar-titulo">Practicar</h3>
          <TapButton
            type="button"
            disabled={micStarting}
            aria-pressed={practiceActive}
            aria-label={practiceActive ? "Desactivar micrófono" : "Activar micrófono"}
            onClick={onTogglePractice}
            className={`encajar-micro ${practiceActive ? "encajar-micro--activo" : ""}`}
          >
            {practiceActive ? null : <span>Activar micrófono</span>}
            <span className="encajar-micro-circulo">
              {practiceActive ? (
                <Mic className="size-5" aria-hidden="true" />
              ) : (
                <MicOff className="size-5" aria-hidden="true" />
              )}
            </span>
          </TapButton>
        </div>

        <div className="encajar-barra">
          <div className="encajar-barra-pista">
            <span
              className="encajar-barra-zona"
              style={{
                left: "50%",
                width: `${zonaAncho}%`,
                transform: "translateX(-50%)",
              }}
            />
            {slots.map((slot) => {
              const esObjetivo = slot.semitoneOffset === 0;
              return (
                <span
                  key={`${slot.note}-${slot.semitoneOffset}`}
                  className={`encajar-barra-nota ${esObjetivo ? "encajar-barra-nota--objetivo" : ""}`}
                  style={{ left: `${semitoneOffsetToLadderPercent(slot.semitoneOffset)}%` }}
                >
                  {slot.note}
                </span>
              );
            })}
            <span className="encajar-barra-centro" style={{ left: "50%" }} />
            {hayVoz ? (
              <span
                className="encajar-barra-punto"
                style={{
                  left: `${markerLeft}%`,
                  backgroundColor: getVozAccuracyColor(accuracy, cents),
                }}
              />
            ) : null}
          </div>
          <div className="encajar-barra-leyenda">
            <span>Más bajo</span>
            <span>Objetivo</span>
            <span>Más alto</span>
          </div>
        </div>

        <div className="encajar-intentos">
          <p>Tus intentos</p>
          <div
            className="encajar-intentos-fila"
            aria-label={`${attempts.length} de ${VOZ_INSTANT_ATTEMPTS_MAX} intentos`}
          >
            {intentos.map((intento, index) => (
              <span
                key={intento?.id ?? `vacio-${index}`}
                className={intento ? puntoClase(intento.result) : "encajar-punto"}
              />
            ))}
          </div>
        </div>
      </section>
  );

  if (layout !== "desktop") {
    return (
      <div className="ejercicio-calmo encajar-ejercicio">
        {practica}
        <PanelDesdeAbajo titulo="Nota objetivo" resumen={formatTargetLabel(target)}>
          {notas}
        </PanelDesdeAbajo>
      </div>
    );
  }

  return (
    <div className="encajar-ejercicio encajar-ejercicio--pc">
      <section className="encajar-panel encajar-panel--notas">
        <h3 className="encajar-titulo">Nota objetivo</h3>
        {notas}
      </section>
      {practica}
    </div>
  );
}
