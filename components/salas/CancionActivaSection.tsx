type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  letra?: string | null;
};

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  letra = null,
}: CancionActivaSectionProps) {
  const hasCancion = Boolean(cancionNombre);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-4 py-4">
      {hasCancion ? (
        <>
          <h2 className="text-xl font-extrabold text-text-primary">
            {cancionNombre}
          </h2>
          {artista && (
            <p className="mt-1 text-[13px] text-text-muted">{artista}</p>
          )}
          {letra && (
            <div
              className="mt-4 rounded-[12px] bg-letra-bg px-[18px] py-5 text-letra-text whitespace-pre-wrap"
              style={{
                fontSize: "var(--letra-size)",
                lineHeight: "var(--letra-line-height)",
                fontWeight: "var(--letra-weight)",
              }}
            >
              {letra}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-muted">
            Ninguna canción seleccionada aún
          </p>
        </div>
      )}
    </section>
  );
}
