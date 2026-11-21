"use client";

import {
  CifradoIngresoAvisos,
  FragmentosIngreso,
} from "@/components/cifrado/CifradoIngresoMarcas";
import { revisarIngresoAcorde } from "@/lib/cifrado-import";
import { useLayoutEffect, useMemo, useRef } from "react";

const CAJA =
  "rounded-estandar border px-4 py-3 font-mono text-sm whitespace-pre-wrap break-words";

type CifradoIngresoCampoProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Alto fijo y desplazamiento adentro. Si no, la caja crece con la letra. */
  crece?: boolean;
  className?: string;
};

function TextoMarcado({
  value,
  fragmentos,
}: {
  value: string;
  fragmentos: ReturnType<typeof revisarIngresoAcorde>["fragmentos"];
}) {
  if (!value) {
    return null;
  }

  return (
    <>
      <FragmentosIngreso fragmentos={fragmentos} />
      {value.endsWith("\n") ? "\n" : null}
    </>
  );
}

export default function CifradoIngresoCampo({
  id,
  value,
  onChange,
  placeholder,
  crece = false,
  className,
}: CifradoIngresoCampoProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const revision = useMemo(() => revisarIngresoAcorde(value), [value]);
  const textoOculto = value.length > 0;

  useLayoutEffect(() => {
    if (crece) {
      return;
    }

    const textarea = textareaRef.current;
    const inner = innerRef.current;

    if (!textarea || !inner) {
      return;
    }

    const sync = () => {
      const estilo = getComputedStyle(textarea);
      const padL = parseFloat(estilo.paddingLeft) || 0;
      const padR = parseFloat(estilo.paddingRight) || 0;
      inner.style.width = `${Math.max(0, textarea.clientWidth - padL - padR)}px`;
      inner.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    };

    sync();
    textarea.addEventListener("scroll", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(textarea);

    return () => {
      textarea.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [crece, value]);

  const campo = crece ? (
    <div className={`relative w-full ${className ?? ""}`}>
      <div
        aria-hidden
        className={`${CAJA} min-h-[inherit] border-transparent bg-letra-bg text-letra-text`}
      >
        <TextoMarcado value={value} fragmentos={revision.fragmentos} />
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${CAJA} absolute inset-0 z-10 resize-none overflow-hidden border-border bg-transparent outline-none placeholder:italic placeholder:text-text-muted caret-[var(--letra-text)] focus:border-accent selection:bg-sky-400/40 selection:text-transparent ${
          textoOculto ? "text-transparent" : "text-letra-text"
        }`}
        style={textoOculto ? { WebkitTextFillColor: "transparent" } : undefined}
      />
    </div>
  ) : (
    <div
      className={`relative flex min-h-0 w-full flex-col overflow-hidden rounded-estandar ${className ?? ""}`}
    >
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${CAJA} relative z-10 min-h-0 w-full flex-1 resize-none overflow-auto border-border bg-transparent outline-none placeholder:italic placeholder:text-text-muted caret-[var(--letra-text)] focus:border-accent selection:bg-sky-400/40 selection:text-transparent ${
          textoOculto ? "text-transparent" : "text-letra-text"
        }`}
        style={textoOculto ? { WebkitTextFillColor: "transparent" } : undefined}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-estandar border border-transparent bg-letra-bg px-4 py-3"
      >
        <div
          ref={innerRef}
          className="whitespace-pre-wrap break-words font-mono text-sm text-letra-text"
        >
          <TextoMarcado value={value} fragmentos={revision.fragmentos} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {campo}
      <CifradoIngresoAvisos revision={revision} />
    </>
  );
}
