import { COLA_BAR_HEIGHT_PX } from "@/lib/sala-layout";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-bg-card ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export function SalasLoadingSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="size-8 shrink-0 rounded-lg" />
          <SkeletonBlock className="h-6 flex-1" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
        <div className="grid grid-cols-2 gap-[10px]">
          <SkeletonBlock className="h-44 rounded-[14px]" />
          <SkeletonBlock className="h-44 rounded-[14px]" />
        </div>

        <SkeletonBlock className="h-4 w-36" />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-[52px] rounded-[12px]" />
          ))}
        </div>
      </main>
    </div>
  );
}

export function SalaLoadingSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-app"
      style={{ height: "100dvh" }}
    >
      <header className="shrink-0 border-b border-accent/35 bg-accent-dim px-2 py-1.5">
        <div className="flex items-center gap-1">
          <SkeletonBlock className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
            <SkeletonBlock className="h-2.5 w-10" />
            <SkeletonBlock className="h-5 w-40" />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <SkeletonBlock className="mb-3 h-4 w-28" />
        <SkeletonBlock className="min-h-0 flex-1 rounded-[12px]" />
      </main>

      <div
        className="mx-2 shrink-0 rounded-t-[12px] border-t border-border/60 bg-bg-cola-sheet px-4 py-2"
        style={{ height: COLA_BAR_HEIGHT_PX }}
      >
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-4 w-14" />
          <SkeletonBlock className="size-7 rounded-full" />
          <SkeletonBlock className="ml-auto h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CancioneroLoadingSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-border bg-bg-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-9 rounded-full" />
          <SkeletonBlock className="h-6 flex-1" />
          <SkeletonBlock className="size-9 rounded-full" />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4 pb-24">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-[72px] rounded-[12px]" />
        ))}
      </main>
    </div>
  );
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
