import {
  APP_FOOTER_HEIGHT_PX,
  getSalaFloatControlsBottomCss,
  getSalaMainFooterPaddingCss,
} from "@/lib/sala-layout";

const CARD_LAYOUTS = [
  { title: "w-[68%]", subtitle: "w-[42%]" },
  { title: "w-[74%]", subtitle: "w-[36%]" },
  { title: "w-[62%]", subtitle: "w-[48%]" },
  { title: "w-[70%]", subtitle: "w-[40%]" },
] as const;

const LETRA_LINE_WIDTHS = [
  "w-[88%]",
  "w-[72%]",
  "w-[94%]",
  "w-[64%]",
  "w-[82%]",
  "w-[76%]",
  "w-[58%]",
  "w-[90%]",
  "w-[68%]",
  "w-[84%]",
  "w-[62%]",
  "w-[78%]",
  "w-[70%]",
  "w-[86%]",
  "w-[60%]",
  "w-[74%]",
  "w-[80%]",
  "w-[66%]",
  "w-[92%]",
  "w-[56%]",
  "w-[72%]",
  "w-[88%]",
  "w-[64%]",
  "w-[76%]",
] as const;

function ShimmerBlock({
  className = "",
  delayMs = 0,
  variant = "surface",
}: {
  className?: string;
  delayMs?: number;
  variant?: "surface" | "letra";
}) {
  return (
    <div
      className={`${variant === "letra" ? "sala-letra-skeleton-line" : "sala-skeleton-shimmer"} rounded-md ${className}`.trim()}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
      aria-hidden="true"
    />
  );
}

function SalaCardSkeleton({
  titleWidth,
  subtitleWidth,
  delayMs = 0,
}: {
  titleWidth: string;
  subtitleWidth: string;
  delayMs?: number;
}) {
  return (
    <div
      className="flex min-h-11 items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3"
      aria-hidden="true"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <ShimmerBlock className={`h-4 ${titleWidth}`} delayMs={delayMs} />
        <ShimmerBlock className={`h-3 ${subtitleWidth}`} delayMs={delayMs + 50} />
      </div>
      <ShimmerBlock className="size-5 shrink-0 rounded-full" delayMs={delayMs + 90} />
    </div>
  );
}

function SalasSectionLabelSkeleton() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <ShimmerBlock className="size-[18px] rounded-full" />
      <ShimmerBlock className="h-3 w-32" delayMs={30} />
    </div>
  );
}

function SalasHeaderSkeleton() {
  return (
    <header className="border-b border-border bg-bg-dark px-4 py-3">
      <div className="flex items-center gap-2.5">
        <ShimmerBlock className="size-8 shrink-0 rounded-lg" />
        <ShimmerBlock className="h-6 flex-1 rounded-lg" />
        <div className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-2 pr-1">
          <ShimmerBlock className="h-4 w-16 rounded-md" delayMs={40} />
          <ShimmerBlock className="size-8 shrink-0 rounded-full" delayMs={60} />
        </div>
      </div>
    </header>
  );
}

function HerramientasHubCardSkeleton({ delayMs = 0 }: { delayMs?: number }) {
  return (
    <div
      className="flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4"
      aria-hidden="true"
    >
      <ShimmerBlock className="h-[13px] w-[72%]" delayMs={delayMs} />
      <ShimmerBlock className="size-16 rounded-xl" delayMs={delayMs + 40} />
      <ShimmerBlock className="h-[34px] w-full rounded-lg" delayMs={delayMs + 80} />
    </div>
  );
}

export function SalaLetraLinesSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2.5 px-4 py-5"
      aria-hidden="true"
    >
      {LETRA_LINE_WIDTHS.map((width, index) => (
        <ShimmerBlock
          key={index}
          variant="letra"
          className={`h-2.5 ${width}`}
          delayMs={index * 45}
        />
      ))}
    </div>
  );
}

export function SalaLetraSkeleton({
  showHeader = true,
}: {
  showHeader?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala px-2 pt-0"
      role="status"
      aria-live="polite"
      aria-label="Cargando letra"
    >
      {showHeader ? (
        <header className="shrink-0 border-b border-border bg-bg-sala px-2 py-1.5">
          <ShimmerBlock className="h-6 w-[58%] rounded-md" />
          <ShimmerBlock className="mt-1.5 h-[13px] w-[34%] rounded-md" delayMs={50} />
        </header>
      ) : (
        <div className="shrink-0 space-y-1.5">
          <ShimmerBlock className="h-6 w-[58%] rounded-md" />
          <ShimmerBlock className="mt-0.5 h-[13px] w-[34%] rounded-md" delayMs={50} />
        </div>
      )}

      <div
        className={`relative mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-letra-bg ${
          showHeader ? "mt-0 rounded-none" : ""
        }`}
      >
        <SalaLetraLinesSkeleton />
      </div>
    </section>
  );
}

function SalaFloatingControlsSkeleton() {
  const floatingBottom = getSalaFloatControlsBottomCss(false);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30"
      style={{ bottom: floatingBottom, height: 0, overflow: "visible" }}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute bottom-0 right-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg-dark px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <ShimmerBlock className="size-4 rounded-md" />
          <ShimmerBlock className="h-4 w-14 rounded-md" delayMs={40} />
        </div>
      </div>
    </div>
  );
}

function SalasFooterSpacer() {
  return (
    <div
      className="shrink-0"
      style={{ height: `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }}
      aria-hidden="true"
    />
  );
}

/** Skeleton del hub /cancionero — replica Herramientas. */
export function HerramientasHubSkeleton() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando herramientas"
    >
      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
        <div className="grid grid-cols-2 gap-[10px]">
          <HerramientasHubCardSkeleton />
          <HerramientasHubCardSkeleton delayMs={60} />
          <HerramientasHubCardSkeleton delayMs={120} />
        </div>
      </main>
    </div>
  );
}

/** Skeleton inline del Home mientras carga la cola inicial. */
export function HomePageSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
      role="status"
      aria-live="polite"
      aria-label="Cargando inicio"
    >
      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: getSalaMainFooterPaddingCss() }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SalaLetraSkeleton showHeader={false} />
        </div>
        <div
          className="pointer-events-none fixed inset-x-2 z-20"
          style={{ bottom: getSalaMainFooterPaddingCss() }}
          aria-hidden="true"
        >
          <ShimmerBlock className="h-[66px] w-full rounded-[16px]" />
        </div>
      </main>
      <SalasFooterSpacer />
    </div>
  );
}

/** Skeleton del listado /salas — replica SalasPageClient. */
export function SalasPageSkeleton() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando salas"
    >
      <SalasHeaderSkeleton />

      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
        <SalasSectionLabelSkeleton />

        <div className="flex flex-col gap-3">
          {CARD_LAYOUTS.map((layout, index) => (
            <SalaCardSkeleton
              key={index}
              titleWidth={layout.title}
              subtitleWidth={layout.subtitle}
              delayMs={index * 80}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

/** Skeleton de navegación a /salas/[id] — replica SalaPageShell en modo control. */
export function SalaPageSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
      role="status"
      aria-live="polite"
      aria-label="Cargando sala"
    >
      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: getSalaMainFooterPaddingCss() }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SalaLetraSkeleton showHeader={false} />
        </div>
      </main>

      <SalaFloatingControlsSkeleton />
      <SalasFooterSpacer />
    </div>
  );
}

/** Skeleton inline mientras la cola inicial se sincroniza en SalaPageShell. */
export function SalaColaBootstrapSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SalaLetraSkeleton showHeader={false} />
    </div>
  );
}
