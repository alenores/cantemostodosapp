type LetraTextoProps = {
  texto: string;
};

/** Hoja blanca con letra/acordes en texto plano (scrape, manual, etc.). */
export default function LetraTexto({ texto }: LetraTextoProps) {
  return (
    <div
      className="mt-4 w-full shrink-0 rounded-[12px] bg-letra-bg px-[18px] py-5 text-letra-text whitespace-pre-wrap"
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
