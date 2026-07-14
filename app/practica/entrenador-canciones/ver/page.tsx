import EntrenadorCancionesVerPageClient from "@/components/herramientas/EntrenadorCancionesVerPageClient";
import { Suspense } from "react";

export default function PracticaEntrenadorCancionesVerPage() {
  return (
    <Suspense fallback={null}>
      <EntrenadorCancionesVerPageClient />
    </Suspense>
  );
}
