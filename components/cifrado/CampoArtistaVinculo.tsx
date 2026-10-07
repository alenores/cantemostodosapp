"use client";

import VincularNombreArtista from "@/components/artistas/VincularNombreArtista";
import type { ArtistaVinculo } from "@/hooks/useArtistaVinculo";

type CampoArtistaVinculoProps = {
  vinculo: ArtistaVinculo;
  texto: string;
};

const CHIP_CLASS =
  "rounded-full border border-border bg-bg-dark/60 px-3 py-1 text-xs text-text-primary transition-colors hover:border-accent active:border-accent";
const LINK_CLASS = "text-xs text-text-muted underline underline-offset-2";

/**
 * Aviso debajo del campo Artista: muestra con qué artista de la lista
 * queda anotada la canción, o pide elegir cuando hay varios parecidos.
 */
export default function CampoArtistaVinculo({
  vinculo,
  texto,
}: CampoArtistaVinculoProps) {
  const { cargado, resultado, nuevoConfirmado } = vinculo;

  if (!cargado || resultado.tipo === "vacio") return null;

  if (resultado.tipo === "seguro") {
    const mismoTexto = resultado.artista.nombre === texto.trim();
    return (
      <p className="mt-1.5 text-xs text-[var(--accent-cancionero)]">
        {mismoTexto
          ? "✓ Artista de la lista"
          : `✓ Se anota como «${resultado.artista.nombre}»`}
      </p>
    );
  }

  /** Solo dueño: anotar lo escrito como otro nombre de un artista de la lista. */
  const vincularDueno = (
    <div className="mt-2 flex">
      <VincularNombreArtista texto={texto} onVinculado={vinculo.elegir} />
    </div>
  );

  if (resultado.tipo === "nuevo" || nuevoConfirmado) {
    return (
      <>
        <p className="mt-1.5 text-xs text-text-muted">
          Artista nuevo: se agrega a la lista al guardar.
          {nuevoConfirmado ? (
            <>
              {" "}
              <button
                type="button"
                className={LINK_CLASS}
                onClick={vinculo.deshacerNuevo}
              >
                Ver sugeridos
              </button>
            </>
          ) : null}
        </p>
        {vincularDueno}
      </>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-[var(--tuner-cerca)]">¿Es alguno de estos?</p>
      <div className="flex flex-wrap gap-2">
        {resultado.candidatos.map((candidato) => (
          <button
            key={candidato.artista.id}
            type="button"
            className={CHIP_CLASS}
            onClick={() => vinculo.elegir(candidato.artista)}
          >
            {candidato.artista.nombre}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={LINK_CLASS}
        onClick={vinculo.confirmarNuevo}
      >
        Es otro artista
      </button>
      {vincularDueno}
    </div>
  );
}
