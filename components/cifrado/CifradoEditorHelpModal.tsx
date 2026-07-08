"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import {
  CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES,
  CIFRADO_LABEL_COMPONER_CICLO,
  CIFRADO_LABEL_CICLO_GUARDADO,
  RITMO_LABEL_INTENSIDAD,
} from "@/lib/ritmo-terminologia";
import {
  HelpCircle,
  Lock,
  Music2,
  Pencil,
  Play,
  Save,
  Timer,
  Type,
  X,
} from "lucide-react";
import { CifradoUnlockIcon } from "@/components/cifrado/CifradoUnlockIcon";
import { useEffect } from "react";
import { createPortal } from "react-dom";

const HELP_ICON_CLASS = "size-4 shrink-0 text-compositor-config";

type CifradoEditorHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CifradoEditorHelpModal({ open, onClose }: CifradoEditorHelpModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar ayuda del editor"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cifrado-editor-help-titulo"
        className="relative z-10 flex h-[min(88vh,640px)] w-full max-w-sm flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-2xl"
      >
        <header
          className="relative shrink-0 border-b bg-bg-dark px-4 pb-4 pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            aria-label="Cerrar ayuda"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </button>

          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              className="flex size-11 items-center justify-center rounded-full border"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--compositor-config) 12%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--compositor-config) 25%, transparent)",
              }}
            >
              <Music2 className="size-5 text-compositor-config" aria-hidden="true" />
            </div>
            <h2
              id="cifrado-editor-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Editor de canciones
            </h2>
            <p className="text-center text-xs text-text-muted">
              Cifrado, compás y letra · guía rápida
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-4">
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Modos de edición
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<Music2 className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Acordes"
                  text="Tocá la letra para colocar un acorde. Arrastrá un acorde para moverlo. Tocá un acorde existente para editarlo o borrarlo."
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={<Timer className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Compás"
                  text="Marcá dónde empieza cada compás en la letra. Podés componer el patrón de intensidad o usar un ciclo guardado del Compositor."
                  shimmerDelayMs={180}
                />
                <HelpInfoCard
                  icon={<Type className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Letra"
                  text="Editá el texto directamente en cada renglón. Ideal para corregir la letra sin mover acordes ni compases."
                  shimmerDelayMs={360}
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Herramienta de compás
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<Timer className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label={CIFRADO_LABEL_COMPONER_CICLO}
                  text={`Elegí cuántos golpes tiene el compás y el patrón de ${RITMO_LABEL_INTENSIDAD.toLowerCase()} (clic en cada barra). Ese modelo se usa al colocar compases nuevos.`}
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={<Play className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label={CIFRADO_LABEL_CICLO_GUARDADO}
                  text="Elegí un ciclo del Compositor para la batería al colocar compases. Si no elegís ninguno, suena el click."
                  shimmerDelayMs={180}
                />
                <HelpInfoCard
                  icon={<Timer className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Aplicar ciclos"
                  text={`Indicá cuántos ciclos querés por renglón y tocá la letra para distribuirlos. ${CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES} repite la misma cantidad en todos los renglones.`}
                  shimmerDelayMs={360}
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Cada renglón
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<Pencil className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Lápiz"
                  text="Abrí opciones del renglón: eliminar, insertar abajo, copiar acordes o compás, o unir con otro renglón."
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={<CifradoUnlockIcon className={HELP_ICON_CLASS} />}
                  label="Candado"
                  text="Bloqueá un renglón para que no se modifique por accidente. El icono con el arco hacia afuera indica que está desbloqueado."
                  shimmerDelayMs={180}
                />
                <HelpInfoCard
                  icon={<Lock className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Renglón bloqueado"
                  text="Con el candado cerrado no podés editar letra, acordes ni compás en ese renglón hasta desbloquearlo."
                  shimmerDelayMs={360}
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Panel lateral y guardado
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<Save className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Guardar"
                  text="Completá nombre (y opcionalmente artista, tonalidad y BPM) y tocá Guardar. Los cambios se sincronizan con tu cancionero."
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={<Play className={HELP_ICON_CLASS} aria-hidden="true" />}
                  label="Reproducir compás"
                  text="Con al menos un compás colocado, el botón play reproduce el ritmo sobre la letra para revisar la colocación."
                  shimmerDelayMs={180}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CifradoEditorHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda del editor de canciones"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-compositor-config/15"
      style={{
        borderColor:
          "color-mix(in srgb, var(--compositor-config) 35%, var(--border))",
        color: "var(--compositor-config)",
        backgroundColor:
          "color-mix(in srgb, var(--compositor-config) 10%, transparent)",
      }}
    >
      <HelpCircle className="size-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
