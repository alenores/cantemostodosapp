"use client";

import { IntensidadIcon } from "@/components/cifrado/AnotacionesLineLayer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  ANOTACION_TEXTO_MAX,
  ANOTACION_TIPOS,
  ANOTACION_TIPO_LABEL,
  EXIGENCIA_ALTURA_PX,
  EXIGENCIA_COLORES,
  EXIGENCIA_COLOR_CSS,
  EXIGENCIA_COLOR_LABEL,
  INTENSIDAD_NIVELES,
  INTENSIDAD_NIVEL_LABEL,
  crearAnotacionId,
  removeAnotacion,
  upsertAnotacion,
  type Anotacion,
  type AnotacionTipo,
  type ExigenciaColor,
  type IntensidadNivel,
} from "@/lib/anotaciones-practica";
import {
  Highlighter,
  Speech,
  StickyNote,
  Trash2,
  Type,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type AnotacionDraft = {
  mode: "new" | "edit";
  tipo: AnotacionTipo;
  lineIndex: number;
  charOffset: number;
  id?: string;
  texto?: string;
  nivel?: IntensidadNivel;
  charEnd?: number;
  color?: ExigenciaColor;
};

export type RangoPendiente = {
  lineIndex: number;
  charOffset: number;
};

/** Menú de tipos (modo Canto): punto de anclaje + posición del tap en pantalla. */
export type TipoMenuState = {
  lineIndex: number;
  charOffset: number;
  x: number;
  y: number;
};

export type AnotacionSubmit = {
  texto?: string;
  nivel?: IntensidadNivel;
  color?: ExigenciaColor;
};

export type AnotacionesControl = {
  items: Anotacion[];
  onChange: (items: Anotacion[]) => void;
};

/**
 * Estado + acciones para colocar/editar/borrar anotaciones desde un editor.
 * Respirar se inserta directo (sin popup); el resto abre su picker.
 */
export function useAnotacionesEditor(control: AnotacionesControl | null) {
  const [draft, setDraft] = useState<AnotacionDraft | null>(null);
  const [rangoPendiente, setRangoPendiente] = useState<RangoPendiente | null>(
    null,
  );
  const [tipoMenu, setTipoMenu] = useState<TipoMenuState | null>(null);

  const enabled = control !== null;

  const placeAt = useCallback(
    (tipo: AnotacionTipo, lineIndex: number, charOffset: number) => {
      if (!control) {
        return;
      }

      if (tipo === "respirar") {
        control.onChange(
          upsertAnotacion(control.items, {
            id: crearAnotacionId(),
            tipo: "respirar",
            lineIndex,
            charOffset,
          }),
        );
        return;
      }

      if (tipo === "exigencia") {
        // Rango en dos toques: primero el inicio, luego el fin (mismo renglón).
        if (!rangoPendiente || rangoPendiente.lineIndex !== lineIndex) {
          setRangoPendiente({ lineIndex, charOffset });
          return;
        }

        if (charOffset === rangoPendiente.charOffset) {
          return;
        }

        const start = Math.min(rangoPendiente.charOffset, charOffset);
        const end = Math.max(rangoPendiente.charOffset, charOffset);
        setRangoPendiente(null);
        setDraft({
          mode: "new",
          tipo: "exigencia",
          lineIndex,
          charOffset: start,
          charEnd: end,
        });
        return;
      }

      setDraft({ mode: "new", tipo, lineIndex, charOffset });
    },
    [control, rangoPendiente],
  );

  const selectExisting = useCallback((anotacion: Anotacion) => {
    setRangoPendiente(null);
    setDraft({
      mode: "edit",
      tipo: anotacion.tipo,
      lineIndex: anotacion.lineIndex,
      charOffset: anotacion.charOffset,
      id: anotacion.id,
      texto: anotacion.texto,
      nivel: anotacion.nivel,
      charEnd: anotacion.charEnd,
      color: anotacion.color,
    });
  }, []);

  const close = useCallback(() => setDraft(null), []);

  const resetRango = useCallback(() => setRangoPendiente(null), []);

  // Menú de tipos (modo Canto): el punto tocado queda como referencia; al
  // elegir un tipo se coloca ahí (o, en exigencia, ese punto es el inicio).
  const openTipoMenu = useCallback(
    (lineIndex: number, charOffset: number, x: number, y: number) => {
      setRangoPendiente(null);
      setTipoMenu({ lineIndex, charOffset, x, y });
    },
    [],
  );

  const closeTipoMenu = useCallback(() => setTipoMenu(null), []);

  const chooseTipo = useCallback(
    (tipo: AnotacionTipo) => {
      if (!tipoMenu) {
        return;
      }

      placeAt(tipo, tipoMenu.lineIndex, tipoMenu.charOffset);
      setTipoMenu(null);
    },
    [tipoMenu, placeAt],
  );

  const resetCanto = useCallback(() => {
    setRangoPendiente(null);
    setTipoMenu(null);
  }, []);

  const submit = useCallback(
    (partial: AnotacionSubmit) => {
      if (!control || !draft) {
        return;
      }

      const anotacion: Anotacion = {
        id: draft.id ?? crearAnotacionId(),
        tipo: draft.tipo,
        lineIndex: draft.lineIndex,
        charOffset: draft.charOffset,
        texto: partial.texto,
        nivel: partial.nivel,
        charEnd: draft.charEnd,
        color: partial.color,
      };

      control.onChange(upsertAnotacion(control.items, anotacion));
      setDraft(null);
    },
    [control, draft],
  );

  const remove = useCallback(() => {
    if (!control || !draft?.id) {
      setDraft(null);
      return;
    }

    control.onChange(removeAnotacion(control.items, draft.id));
    setDraft(null);
  }, [control, draft]);

  return {
    enabled,
    draft,
    rangoPendiente,
    tipoMenu,
    placeAt,
    selectExisting,
    close,
    resetRango,
    openTipoMenu,
    closeTipoMenu,
    chooseTipo,
    resetCanto,
    submit,
    remove,
  };
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useHardwareBack(true, onClose);

  useEffect(() => {
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
  }, [onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-xl"
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
            {title}
          </h2>
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </TapButton>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

type AnotacionPickerHostProps = {
  draft: AnotacionDraft;
  onClose: () => void;
  onSubmit: (partial: AnotacionSubmit) => void;
  onDelete: () => void;
};

/** Renderiza el picker correcto según el tipo del borrador. */
export function AnotacionPickerHost({
  draft,
  onClose,
  onSubmit,
  onDelete,
}: AnotacionPickerHostProps) {
  const [texto, setTexto] = useState(draft.texto ?? "");
  const [color] = useState<ExigenciaColor>(draft.color ?? "amarillo");

  const isEditing = draft.mode === "edit";

  if (draft.tipo === "nota" || draft.tipo === "texto") {
    const esTexto = draft.tipo === "texto";
    const title = esTexto ? "Texto corto" : "Nota del renglón";

    return (
      <ModalShell title={title} onClose={onClose}>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
          {esTexto ? (
            <input
              autoFocus
              value={texto}
              maxLength={ANOTACION_TEXTO_MAX}
              onChange={(event) =>
                setTexto(event.target.value.slice(0, ANOTACION_TEXTO_MAX))
              }
              placeholder="Máx. 20 caracteres"
              className="min-h-11 w-full rounded-[10px] border border-border bg-letra-bg px-4 text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-accent"
            />
          ) : (
            <textarea
              autoFocus
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder="Escribí la nota para este punto del renglón…"
              className="min-h-[140px] w-full flex-1 resize-none rounded-[10px] border border-border bg-letra-bg px-4 py-3 text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-accent"
            />
          )}

          {esTexto ? (
            <p className="text-right text-[11px] text-text-muted">
              {texto.length}/{ANOTACION_TEXTO_MAX}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            {isEditing ? (
              <TapButton
                type="button"
                onClick={onDelete}
                className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-border bg-bg-dark px-3 text-sm font-semibold text-text-secondary"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Quitar
              </TapButton>
            ) : null}
            <TapButton
              type="button"
              disabled={esTexto && texto.trim().length === 0}
              onClick={() => onSubmit({ texto: texto.trim() })}
              className="min-h-11 flex-1 rounded-[10px] bg-[var(--accent-entrenador-canciones)] text-sm font-bold text-[var(--text-on-light)] disabled:opacity-50"
            >
              {isEditing ? "Guardar" : "Agregar"}
            </TapButton>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (draft.tipo === "intensidad") {
    return (
      <ModalShell title="Intensidad" onClose={onClose}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-4">
          {INTENSIDAD_NIVELES.map((nivel) => (
            <TapButton
              key={nivel}
              type="button"
              onClick={() => onSubmit({ nivel })}
              className={`flex min-h-11 items-center justify-between rounded-[10px] border px-4 text-sm font-semibold ${
                draft.nivel === nivel
                  ? "border-[var(--accent-entrenador-canciones)] bg-[var(--accent-entrenador-canciones-dim)] text-text-primary"
                  : "border-border bg-bg-dark text-text-secondary"
              }`}
            >
              {INTENSIDAD_NIVEL_LABEL[nivel]}
              <IntensidadIcon nivel={nivel} arrowSize={13} />
            </TapButton>
          ))}

          {isEditing ? (
            <TapButton
              type="button"
              onClick={onDelete}
              className="mt-1 flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-bg-dark px-3 text-sm font-semibold text-text-secondary"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Quitar
            </TapButton>
          ) : null}
        </div>
      </ModalShell>
    );
  }

  if (draft.tipo === "exigencia") {
    return (
      <ModalShell title="Exigencia" onClose={onClose}>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
          <p className="text-sm text-text-secondary">
            Tocá un color para aplicarlo a este tramo de la letra.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {EXIGENCIA_COLORES.map((opcion) => (
              <TapButton
                key={opcion}
                type="button"
                onClick={() => onSubmit({ color: opcion })}
                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 text-xs font-semibold ${
                  color === opcion
                    ? "border-[var(--accent-entrenador-canciones)] text-text-primary"
                    : "border-border text-text-secondary"
                }`}
              >
                <span
                  className="flex h-7 w-8 items-end justify-center"
                  aria-hidden="true"
                >
                  <span
                    className="w-5 rounded-[3px] border border-border/40"
                    style={{
                      height: EXIGENCIA_ALTURA_PX[opcion],
                      backgroundColor: EXIGENCIA_COLOR_CSS[opcion],
                    }}
                  />
                </span>
                {EXIGENCIA_COLOR_LABEL[opcion]}
              </TapButton>
            ))}
          </div>

          {isEditing ? (
            <TapButton
              type="button"
              onClick={onDelete}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-bg-dark px-3 text-sm font-semibold text-text-secondary"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Quitar
            </TapButton>
          ) : null}
        </div>
      </ModalShell>
    );
  }

  // respirar (solo edición → quitar)
  return (
    <ModalShell title="Respiración" onClose={onClose}>
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="text-sm text-text-secondary">
          Marca de respiración en este punto del renglón.
        </p>
        <TapButton
          type="button"
          onClick={onDelete}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-bg-dark px-3 text-sm font-semibold text-text-secondary"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Quitar respiración
        </TapButton>
      </div>
    </ModalShell>
  );
}

const TIPO_MENU_ICON: Record<AnotacionTipo, LucideIcon> = {
  nota: StickyNote,
  intensidad: Speech,
  texto: Type,
  respirar: Wind,
  exigencia: Highlighter,
};

const TIPO_MENU_HINT: Record<AnotacionTipo, string> = {
  nota: "Ícono con nota al tocar",
  intensidad: "Más fuerte / más suave",
  texto: "Texto corto bajo la letra",
  respirar: "Marca de respiración",
  exigencia: "Resaltar un tramo",
};

type AnotacionTipoMenuProps = {
  x: number;
  y: number;
  onPick: (tipo: AnotacionTipo) => void;
  onClose: () => void;
};

/**
 * Menú contextual del modo Canto anclado al punto tocado.
 * En celular funciona como racimo de opciones; en PC como popover.
 */
export function AnotacionTipoMenu({
  x,
  y,
  onPick,
  onClose,
}: AnotacionTipoMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useHardwareBack(true, onClose);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const margin = 8;
    const rect = el.getBoundingClientRect();

    let left = x;
    let top = y + 12;

    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - margin - rect.width;
    }

    if (left < margin) {
      left = margin;
    }

    if (top + rect.height > window.innerHeight - margin) {
      top = y - rect.height - 12;
    }

    if (top < margin) {
      top = margin;
    }

    setPos({ left, top });
  }, [x, y]);

  return createPortal(
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="menu"
        aria-label="Agregar marca de canto"
        className="absolute w-[210px] rounded-[16px] border border-border bg-bg-card p-1.5 shadow-xl"
        style={{
          left: pos?.left ?? x,
          top: pos?.top ?? y,
          visibility: pos ? "visible" : "hidden",
        }}
      >
        <p className="px-2 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
          Agregar marca
        </p>
        {ANOTACION_TIPOS.map((tipo) => {
          const Icon = TIPO_MENU_ICON[tipo];

          return (
            <TapButton
              key={tipo}
              type="button"
              role="menuitem"
              onClick={() => onPick(tipo)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left hover:bg-bg-dark"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-entrenador-canciones-dim)] text-[var(--accent-entrenador-canciones)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-text-primary">
                  {ANOTACION_TIPO_LABEL[tipo]}
                </span>
                <span className="block text-[11px] leading-tight text-text-muted">
                  {TIPO_MENU_HINT[tipo]}
                </span>
              </span>
            </TapButton>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
