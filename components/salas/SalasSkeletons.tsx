import {
  APP_FOOTER_HEIGHT_PX,
  CONTROL_LETRA_HORIZONTAL_INSET,
  CONTROL_LETRA_ORIGEN_GAP_PX,
  CONTROL_LETRA_SHELL_CLASS,
  getControlCantarHorizontalPaddingStyle,
  getControlHeaderVerticalPaddingStyle,
  getLetraSectionTextBottomPadding,
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

const HOME_DESTINATION_LAYOUTS = [
  { label: "w-[38%]", description: "w-[72%]", help: "w-[58%]" },
  { label: "w-[34%]", description: "w-[68%]", help: "w-[52%]" },
  { label: "w-[28%]", description: "w-[64%]", help: "w-[48%]" },
  { label: "w-[36%]", description: "w-[70%]", help: "w-[54%]" },
  { label: "w-[32%]", description: "w-[66%]", help: "w-[50%]" },
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

/** Replica visual de AppTopHeader (accent). */
export function AppTopHeaderSkeleton() {
  return (
    <header className="shrink-0 overflow-x-clip border-b border-accent/40 bg-accent px-4 py-3 lg:hidden">
      <div className="app-page-container flex w-full min-w-0 items-center gap-2.5">
        <div
          className="size-8 shrink-0 animate-pulse rounded-lg bg-bg-darker/25"
          aria-hidden="true"
        />
        <div
          className="h-6 flex-1 animate-pulse rounded-lg bg-bg-darker/25"
          aria-hidden="true"
        />
        <div className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-2 pr-1">
          <div
            className="h-4 w-16 animate-pulse rounded-md bg-bg-darker/25"
            aria-hidden="true"
          />
          <div
            className="size-8 shrink-0 animate-pulse rounded-full bg-bg-darker/25"
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
}

function HomeDestinationCardSkeleton({
  labelWidth,
  descriptionWidth,
  helpWidth,
  delayMs = 0,
}: {
  labelWidth: string;
  descriptionWidth: string;
  helpWidth: string;
  delayMs?: number;
}) {
  return (
    <div
      className="relative flex w-full items-center gap-3 rounded-2xl border border-border bg-bg-card px-4 py-5"
      aria-hidden="true"
    >
      <ShimmerBlock className="size-[46px] shrink-0 rounded-xl" delayMs={delayMs} />
      <div className="min-w-0 flex-1 space-y-2">
        <ShimmerBlock className={`h-[17px] ${labelWidth}`} delayMs={delayMs + 30} />
        <ShimmerBlock className={`h-[13px] ${descriptionWidth}`} delayMs={delayMs + 60} />
        <ShimmerBlock className={`h-[12px] ${helpWidth}`} delayMs={delayMs + 90} />
      </div>
    </div>
  );
}

function HubModuleCardSkeleton({ delayMs = 0 }: { delayMs?: number }) {
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
      <ShimmerBlock className="size-5 shrink-0 rounded-md" delayMs={delayMs + 90} />
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

function SalasFooterSpacer() {
  return (
    <div
      className="shrink-0"
      style={{ height: `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }}
      aria-hidden="true"
    />
  );
}

/** Líneas shimmer al cargar letra/cifrado de una canción activa. */
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

function ControlFilaButtonSkeleton() {
  return (
    <div
      className="flex shrink-0 items-center justify-end"
      style={{ paddingTop: CONTROL_LETRA_ORIGEN_GAP_PX }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-accent/50 bg-bg-dark px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <ShimmerBlock className="size-4 rounded-md" />
        <ShimmerBlock className="h-4 w-14 rounded-md" delayMs={40} />
      </div>
    </div>
  );
}

/**
 * Shell modo control (Individual / Sala): header con buscar (+ back opcional),
 * panel de letra vacío y botón Fila inline — alineado a CancionActivaSection vacío.
 */
export function ControlModeShellSkeleton({
  showBack = false,
}: {
  showBack?: boolean;
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala pt-0"
      style={{
        ...getControlCantarHorizontalPaddingStyle(),
        paddingBottom: getLetraSectionTextBottomPadding(),
      }}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <header
        className="flex shrink-0 items-start gap-2 overflow-hidden border-b border-border bg-bg-sala"
        style={getControlHeaderVerticalPaddingStyle()}
      >
        {showBack ? (
          <ShimmerBlock className="size-9 shrink-0 rounded-full" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <ShimmerBlock className="h-5 w-[48%] rounded-md" delayMs={30} />
          <ShimmerBlock className="h-3 w-[28%] rounded-md" delayMs={60} />
        </div>
        <ShimmerBlock className="size-9 shrink-0 rounded-full" delayMs={40} />
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{
          marginLeft: CONTROL_LETRA_HORIZONTAL_INSET,
          marginRight: CONTROL_LETRA_HORIZONTAL_INSET,
        }}
      >
        <div
          className={`relative flex min-h-0 flex-1 flex-col bg-letra-bg ${CONTROL_LETRA_SHELL_CLASS}`}
        >
          <div className="flex min-h-0 flex-1 items-center justify-center px-6">
            <div className="flex w-full max-w-[16rem] flex-col items-center gap-2">
              <ShimmerBlock
                variant="letra"
                className="h-3 w-[88%]"
                delayMs={80}
              />
              <ShimmerBlock
                variant="letra"
                className="h-3 w-[72%]"
                delayMs={120}
              />
            </div>
          </div>
        </div>
        <ControlFilaButtonSkeleton />
      </div>
    </section>
  );
}

/** @deprecated Usar ControlModeShellSkeleton — se mantiene por imports legacy. */
export function SalaLetraSkeleton({
  showHeader = true,
}: {
  showHeader?: boolean;
  compact?: boolean;
}) {
  void showHeader;
  return <ControlModeShellSkeleton />;
}

/** Skeleton del home de bienvenida (`/` + HomeHubDestinations). */
export function HomeWelcomeSkeleton() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando inicio"
    >
      <AppTopHeaderSkeleton />
      <main className="app-page-main flex flex-col gap-3 px-4 py-6 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col items-center gap-3">
            <ShimmerBlock className="h-7 w-[42%] rounded-md" />
            <ShimmerBlock className="h-5 w-[36%] rounded-md" delayMs={40} />
          </div>

          <div className="flex flex-col gap-3">
            {HOME_DESTINATION_LAYOUTS.map((layout, index) => (
              <HomeDestinationCardSkeleton
                key={index}
                labelWidth={layout.label}
                descriptionWidth={layout.description}
                helpWidth={layout.help}
                delayMs={index * 70}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Skeleton del hub de sección (`/canciones`, `/practica`).
 * Sin AppTopHeader: lo aporta el layout de la ruta.
 */
export function HubSectionSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div
      className="relative flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando sección"
    >
      <main className="app-page-main flex flex-col gap-3 px-4 py-6 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-col gap-3 lg:gap-4">
          <ShimmerBlock className="h-7 w-[36%] rounded-md" />
          <div className="app-hub-grid">
            {Array.from({ length: cardCount }, (_, index) => (
              <HubModuleCardSkeleton key={index} delayMs={index * 70} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** @deprecated Alias histórico — el home real es HomeWelcomeSkeleton. */
export const HerramientasHubSkeleton = HomeWelcomeSkeleton;

/** Skeleton de navegación a /individual — modo control vacío. */
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
          <ControlModeShellSkeleton />
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
      <AppTopHeaderSkeleton />

      <main className="app-page-main flex flex-1 flex-col gap-3 px-4 py-6 pb-24 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-1 flex-col gap-3 lg:gap-4">
          <SalasSectionLabelSkeleton />

          <div className="app-list-grid">
            {CARD_LAYOUTS.map((layout, index) => (
              <SalaCardSkeleton
                key={index}
                titleWidth={layout.title}
                subtitleWidth={layout.subtitle}
                delayMs={index * 80}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Skeleton de navegación a /salas/[id] — modo control con back. */
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
          <ControlModeShellSkeleton showBack />
        </div>
      </main>
      <SalasFooterSpacer />
    </div>
  );
}

/** Skeleton inline mientras la cola inicial se sincroniza. */
export function SalaColaBootstrapSkeleton({
  showBack = false,
}: {
  showBack?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ControlModeShellSkeleton showBack={showBack} />
    </div>
  );
}
