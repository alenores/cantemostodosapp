import { DesktopAppSkeleton, HomeWelcomeSkeleton } from "@/components/salas/SalasSkeletons";

/** También se renderiza en el HTML inicial para evitar un flash de marca. */
export default function AppLoadingSkeleton() {
  return (
    <div role="status" aria-label="Cargando pantalla" className="flex min-h-0 flex-1 flex-col overflow-hidden tono-pagina lg:fixed lg:inset-0 lg:z-[100]">
      <span className="sr-only">Cargando pantalla…</span>
      {/* En el celular no tapa la barra de abajo. */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <HomeWelcomeSkeleton />
      </div>
      <div className="hidden h-full lg:block">
        <DesktopAppSkeleton />
      </div>
    </div>
  );
}
