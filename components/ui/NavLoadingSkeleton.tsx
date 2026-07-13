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
}: {
  cardCount?: number;
}) {
  return <HubSectionSkeleton cardCount={cardCount} />;
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
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="size-9 animate-pulse rounded-full bg-bg-darker/25"
            aria-hidden="true"
          />
          <div
            className="h-6 w-28 animate-pulse rounded-lg bg-bg-darker/25"
            aria-hidden="true"
          />
        </div>
      </header>

      <main className="app-page-main flex flex-1 flex-col gap-6 px-4 py-6 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container mx-auto flex w-full max-w-xl flex-col gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <SkeletonBlock className="size-24 rounded-full" />
              <SkeletonBlock className="absolute -bottom-1 -right-1 size-9 rounded-full" />
            </div>
            <SkeletonBlock className="h-3 w-40" />
          </div>

          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-10 w-full rounded-[10px]" />
          </div>

          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-10 w-full rounded-[10px]" />
            <SkeletonBlock className="h-3 w-[90%]" />
          </div>

          <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-bg-card/50 p-4">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-[85%]" />
            <SkeletonBlock className="h-10 w-full rounded-[10px]" />
            <SkeletonBlock className="h-10 w-full rounded-[10px]" />
            <SkeletonBlock className="h-10 w-full rounded-[10px]" />
          </div>

          <SkeletonBlock className="h-11 w-full rounded-[10px]" />
          <SkeletonBlock className="mt-2 h-11 w-full rounded-[10px]" />
        </div>
      </main>
    </div>
  );
}

/** @deprecated Usar HomeWelcomeLoadingSkeleton */
export const CancioneroHubLoadingSkeleton = HomeWelcomeLoadingSkeleton;
