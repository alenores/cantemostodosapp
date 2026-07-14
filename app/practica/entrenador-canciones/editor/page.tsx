import EntrenadorCancionesEditorPageClient from "@/components/herramientas/EntrenadorCancionesEditorPageClient";
import { Suspense } from "react";

export default function PracticaEntrenadorCancionesEditorPage() {
  return (
    <Suspense fallback={null}>
      <EntrenadorCancionesEditorPageClient />
    </Suspense>
  );
}
