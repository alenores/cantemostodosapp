import {
  getLetraModoLecturaHorizontalPadding,
  getLetraModoLecturaHorizontalPaddingRight,
} from "@/lib/sala-layout";

type LetraTextoProps = {
  texto: string;
  edgeToEdge?: boolean;
  fillViewport?: boolean;
  scrollEndPadding?: string;
  /** Modo lectura: margen lateral mínimo para aprovechar el ancho de pantalla. */
  compactHorizontalPadding?: boolean;
};

/** Hoja blanca con letra/acordes en texto plano (scrape, manual, etc.). */
export default function LetraTexto({
  texto,
  edgeToEdge = false,
  fillViewport = false,
  scrollEndPadding,
  compactHorizontalPadding = false,
}: LetraTextoProps) {
  const horizontalPaddingClass = compactHorizontalPadding ? "" : "px-[18px]";

  return (
    <div
      className={
        edgeToEdge
          ? `w-full shrink-0 bg-letra-bg py-5 text-letra-text whitespace-pre-wrap ${horizontalPaddingClass}${fillViewport ? " min-h-full" : ""}`
          : `mt-4 w-full shrink-0 rounded-[12px] bg-letra-bg py-5 text-letra-text whitespace-pre-wrap ${horizontalPaddingClass}`
      }
      style={{
        fontSize: "var(--letra-size)",
        lineHeight: "var(--letra-line-height)",
        fontWeight: "var(--letra-weight)",
        paddingBottom: scrollEndPadding,
        ...(compactHorizontalPadding
          ? {
              paddingLeft: getLetraModoLecturaHorizontalPadding(),
              paddingRight: getLetraModoLecturaHorizontalPaddingRight(),
            }
          : {}),
      }}
    >
      {texto}
    </div>
  );
}
