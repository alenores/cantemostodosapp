type LetraTextoProps = {
  texto: string;
  edgeToEdge?: boolean;
  fillViewport?: boolean;
  scrollEndPadding?: string;
};

/** Hoja blanca con letra/acordes en texto plano (scrape, manual, etc.). */
export default function LetraTexto({
  texto,
  edgeToEdge = false,
  fillViewport = false,
  scrollEndPadding,
}: LetraTextoProps) {
  return (
    <div
      className={
        edgeToEdge
          ? `w-full shrink-0 bg-letra-bg px-[18px] py-5 text-letra-text whitespace-pre-wrap${fillViewport ? " min-h-full" : ""}`
          : "mt-4 w-full shrink-0 rounded-[12px] bg-letra-bg px-[18px] py-5 text-letra-text whitespace-pre-wrap"
      }
      style={{
        fontSize: "var(--letra-size)",
        lineHeight: "var(--letra-line-height)",
        fontWeight: "var(--letra-weight)",
        paddingBottom: scrollEndPadding,
      }}
    >
      {texto}
    </div>
  );
}
