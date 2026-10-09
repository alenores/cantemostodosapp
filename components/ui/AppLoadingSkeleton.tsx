import { HomeWelcomeSkeleton } from "@/components/salas/SalasSkeletons";

/** También se renderiza en el HTML inicial para evitar un flash de marca. */
export default function AppLoadingSkeleton() {
  return (
    <div role="status" aria-label="Cargando pantalla" className="fixed inset-0 z-[100] overflow-hidden bg-[#181818]">
      <span className="sr-only">Cargando pantalla…</span>
      <HomeWelcomeSkeleton />
    </div>
  );
}
