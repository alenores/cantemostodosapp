import {
  CancioneroSubpageSkeleton,
  FavoritasPageSkeleton,
} from "@/components/cancionero/CancioneroListSkeleton";
import {
  HomePageSkeleton,
  HomeWelcomeSkeleton,
  HubSectionSkeleton,
  SalaPageSkeleton,
  SalasPageSkeleton,
} from "@/components/salas/SalasSkeletons";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`cancionero-skeleton-shimmer rounded-lg ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export function SalasLoadingSkeleton() {
  return <SalasPageSkeleton />;
}

export function SalaLoadingSkeleton() {
  return <SalaPageSkeleton />;
}

/** Home de bienvenida (`/`). */
export function HomeWelcomeLoadingSkeleton() {
  return <HomeWelcomeSkeleton />;
}

/** Hub de sección (`/canciones`, `/practica`) — sin AppTopHeader (lo da el layout). */
export function HubSectionLoadingSkeleton({
  cardCount = 3,
  showAdd = false,
}: {
  cardCount?: number;
  showAdd?: boolean;
}) {
  return <HubSectionSkeleton cardCount={cardCount} showAdd={showAdd} />;
}

/** @deprecated Usar HomeWelcomeLoadingSkeleton */
export function HerramientasLoadingSkeleton() {
  return <HomeWelcomeSkeleton />;
}

export function CancioneroLoadingSkeleton() {
  return <CancioneroSubpageSkeleton />;
}

export function FavoritasLoadingSkeleton() {
  return <FavoritasPageSkeleton />;
}

export function IndividualLoadingSkeleton() {
  return <HomePageSkeleton />;
}

export function PerfilLoadingSkeleton() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando perfil"
    >
      <header className="px-4 pb-2 lg:hidden" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-11 rounded-full" />
          <SkeletonBlock className="h-6 w-28" />
        </div>
      </header>

      <main className="app-page-main flex flex-1 flex-col gap-8 px-4 py-4 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex w-full flex-col gap-8">
          <div className="hidden lg:block">
            <SkeletonBlock className="h-8 w-32" />
          </div>

          <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center">
            <SkeletonBlock className="size-24 rounded-full" />
            <div className="flex flex-col items-center gap-2 lg:items-start">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-48" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3 border-b border-border/50 pb-2">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        </div>
      </main>
    </div>
  );
}

/** @deprecated Usar HomeWelcomeLoadingSkeleton */
export const CancioneroHubLoadingSkeleton = HomeWelcomeLoadingSkeleton;
