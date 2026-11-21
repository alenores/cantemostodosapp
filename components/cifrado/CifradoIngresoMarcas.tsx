"use client";

import type {
  FragmentoIngreso,
  RevisionIngresoAcorde,
} from "@/lib/cifrado-import";

export function FragmentosIngreso({
  fragmentos,
}: {
  fragmentos: FragmentoIngreso[];
}) {
  return fragmentos.map((parte, indice) => {
    if (parte.tipo === "rojo") {
      return (
        <span key={indice} className="rounded-sm bg-red-300/80 text-red-950">
          {parte.texto}
        </span>
      );
    }

    if (parte.tipo === "amarillo") {
      return (
        <span
          key={indice}
          className="rounded-sm bg-amber-300/90 text-amber-950"
        >
          {parte.texto}
        </span>
      );
    }

    return <span key={indice}>{parte.texto}</span>;
  });
}

export function CifradoIngresoAvisos({
  revision,
}: {
  revision: RevisionIngresoAcorde;
}) {
  if (!revision.hayRojo && !revision.hayAmarillo) {
    return null;
  }

  return (
    <div className="mt-2 shrink-0">
      {revision.hayRojo ? (
        <p className="text-xs font-medium text-red-200">
          Lo rojo hay que corregirlo para poder seguir.
        </p>
      ) : null}
      {revision.hayAmarillo ? (
        <p
          className={`text-xs font-medium text-amber-200 ${revision.hayRojo ? "mt-1" : ""}`}
        >
          Lo amarillo se pierde si no lo cambiás.
        </p>
      ) : null}
    </div>
  );
}
