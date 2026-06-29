import { CancioneroPageSkeleton } from "@/components/cancionero/CancioneroListSkeleton";
import {
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

export function CancioneroLoadingSkeleton() {
  return <CancioneroPageSkeleton />;
}

export function PerfilLoadingSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-border bg-bg-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-9 rounded-full" />
          <SkeletonBlock className="h-6 w-24" />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <SkeletonBlock className="size-24 rounded-full" />
          <SkeletonBlock className="h-10 w-full rounded-[10px]" />
          <SkeletonBlock className="h-10 w-full rounded-[10px]" />
        </div>
        <SkeletonBlock className="mt-4 h-11 w-full rounded-[10px]" />
      </main>
    </div>
  );
}
