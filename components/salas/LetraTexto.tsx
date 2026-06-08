type LetraTextoProps = {
  texto: string;
  /** Ocupa al menos el alto visible bajo el título (hoja blanca grande). */
  fillViewport?: boolean;
};

/** Hoja blanca con letra/acordes en texto plano (scrape, manual, etc.). */
export default function LetraTexto({
  texto,
  fillViewport = true,
}: LetraTextoProps) {
  return (
    <div
      className={`mt-3 w-full shrink-0 rounded-[12px] bg-letra-bg px-2.5 py-5 text-letra-text whitespace-pre-wrap ${
        fillViewport
          ? "min-h-[calc(100dvh-13.5rem-env(safe-area-inset-bottom,0px))]"
          : ""
      }`}
      style={{
        fontSize: "var(--letra-size)",
        lineHeight: "var(--letra-line-height)",
        fontWeight: "var(--letra-weight)",
      }}
    >
      {texto}
    </div>
  );
}
