"use client";

import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import MisCancionesPageClient from "@/components/cancionero/MisCancionesPageClient";
import { useState } from "react";

type CancioneroTabShellProps = {
  usuarioId: string | null;
};

type TabId = "global" | "mis-canciones";

export default function CancioneroTabShell({
  usuarioId,
}: CancioneroTabShellProps) {
  const [tabActiva, setTabActiva] = useState<TabId>("global");
  const mostrarMisCanciones = usuarioId !== null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app" style={{ height: "100%" }}>
      <div className="flex shrink-0 border-b border-border bg-bg-dark px-4">
        <button
          type="button"
          onClick={() => setTabActiva("global")}
          className={`border-b-2 px-3 py-2 text-sm ${
            tabActiva === "global"
              ? "border-accent font-semibold text-accent"
              : "border-transparent font-medium text-text-muted"
          }`}
        >
          Global
        </button>
        {mostrarMisCanciones && (
          <button
            type="button"
            onClick={() => setTabActiva("mis-canciones")}
            className={`border-b-2 px-3 py-2 text-sm ${
              tabActiva === "mis-canciones"
                ? "border-accent font-semibold text-accent"
                : "border-transparent font-medium text-text-muted"
            }`}
          >
            Mis canciones
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tabActiva === "global" ? (
          <CancioneroPageClient hideBack />
        ) : (
          <MisCancionesPageClient />
        )}
      </div>
    </div>
  );
}
