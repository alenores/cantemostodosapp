const CARD_LAYOUTS = [
  { title: "w-[72%]", artist: "w-[48%]" },
  { title: "w-[84%]", artist: "w-[56%]" },
  { title: "w-[64%]", artist: "w-[40%]" },
  { title: "w-[78%]", artist: "w-[52%]" },
  { title: "w-[70%]", artist: "w-[44%]" },
  { title: "w-[80%]", artist: "w-[50%]" },
  { title: "w-[66%]", artist: "w-[38%]" },
] as const;

export const CASCADE_STAGGER_MS = 58;
export const CASCADE_MAX_DELAY_MS = 720;

type CancioneroCardSkeletonProps = {
  titleWidth: string;
  artistWidth: string;
  shimmerDelayMs: number;
};

export function CancioneroCardSkeleton({
  titleWidth,
  artistWidth,
  shimmerDelayMs,
}: CancioneroCardSkeletonProps) {
  return (
    <div
      className="rounded-[12px] border border-border-card bg-bg-card px-3 py-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div
          className="cancionero-skeleton-shimmer size-6 shrink-0 rounded-md border border-border"
          style={{ animationDelay: `${shimmerDelayMs}ms` }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className={`cancionero-skeleton-shimmer h-[17px] rounded-md ${titleWidth}`}
            style={{ animationDelay: `${shimmerDelayMs + 40}ms` }}
          />
          <div
            className={`cancionero-skeleton-shimmer h-[14px] rounded-md ${artistWidth}`}
            style={{ animationDelay: `${shimmerDelayMs + 80}ms` }}
          />
        </div>
        <div
          className="cancionero-skeleton-shimmer size-3.5 shrink-0 rounded-full ring-1 ring-border"
          style={{ animationDelay: `${shimmerDelayMs + 120}ms` }}
        />
      </div>
    </div>
  );
}

function SectionLabelSkeleton() {
  return (
    <div
      className="cancionero-skeleton-shimmer mb-2 h-3 w-28 rounded-md"
      aria-hidden="true"
    />
  );
}

export function BuscadorSearchSkeleton({ cardCount = 5 }: { cardCount?: number }) {
  return (
    <div
      className="flex flex-col gap-2"
      role="status"
      aria-live="polite"
      aria-label="Buscando canciones"
    >
      <SectionLabelSkeleton />
      {CARD_LAYOUTS.slice(0, cardCount).map((layout, index) => (
        <CancioneroCardSkeleton
          key={index}
          titleWidth={layout.title}
          artistWidth={layout.artist}
          shimmerDelayMs={index * 90}
        />
      ))}
    </div>
  );
}

export function BuscadorInternetPendingSkeleton({ cardCount = 2 }: { cardCount?: number }) {
  return (
    <div className="mt-2 flex flex-col gap-2" aria-hidden="true">
      {CARD_LAYOUTS.slice(0, cardCount).map((layout, index) => (
        <CancioneroCardSkeleton
          key={index}
          titleWidth={layout.title}
          artistWidth={layout.artist}
          shimmerDelayMs={index * 90}
        />
      ))}
    </div>
  );
}

export function SearchFieldSkeleton() {
  return (
    <div
      className="relative rounded-[10px] border border-border bg-[#323232] px-4 py-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div className="cancionero-skeleton-shimmer size-4 shrink-0 rounded-full" />
        <div className="cancionero-skeleton-shimmer h-4 flex-1 rounded-md" />
      </div>
    </div>
  );
}

function CancioneroSkeletonHeader() {
  return (
    <div
      className="flex items-center justify-center gap-1 py-1"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          className="cancionero-skeleton-eq-bar w-1 rounded-full"
          style={{ animationDelay: `${index * 0.14}s` }}
        />
      ))}
    </div>
  );
}

type CancioneroListSkeletonProps = {
  includeSearch?: boolean;
  cardCount?: number;
  showHeader?: boolean;
};

export default function CancioneroListSkeleton({
  includeSearch = true,
  cardCount = 7,
  showHeader = false,
}: CancioneroListSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      aria-label="Cargando canciones guardadas"
    >
      {showHeader ? <CancioneroSkeletonHeader /> : null}
      {includeSearch ? <SearchFieldSkeleton /> : null}
      <div className="flex flex-col gap-3">
        {CARD_LAYOUTS.slice(0, cardCount).map((layout, index) => (
          <CancioneroCardSkeleton
            key={index}
            titleWidth={layout.title}
            artistWidth={layout.artist}
            shimmerDelayMs={index * 90}
          />
        ))}
      </div>
    </div>
  );
}

export function CancioneroPageSkeleton() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando cancionero"
    >
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="cancionero-skeleton-shimmer size-11 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div
            className="cancionero-skeleton-shimmer h-6 flex-1 rounded-lg"
            aria-hidden="true"
          />
          <div
            className="cancionero-skeleton-shimmer size-11 shrink-0 rounded-full"
            aria-hidden="true"
          />
        </div>
      </header>

      <main className="flex flex-col gap-3 px-4 py-4 pb-24">
        <SearchFieldSkeleton />
        <div className="flex flex-col gap-3">
          {CARD_LAYOUTS.map((layout, index) => (
            <CancioneroCardSkeleton
              key={index}
              titleWidth={layout.title}
              artistWidth={layout.artist}
              shimmerDelayMs={index * 90}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export const CancioneroSubpageSkeleton = CancioneroPageSkeleton;
