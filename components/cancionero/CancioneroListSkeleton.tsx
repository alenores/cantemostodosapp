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

type CardTrailing = "bookmark" | "listPlus" | "none";

type CancioneroCardSkeletonProps = {
  titleWidth: string;
  artistWidth: string;
  shimmerDelayMs: number;
  trailing?: CardTrailing;
};

export function CancioneroCardSkeleton({
  titleWidth,
  artistWidth,
  shimmerDelayMs,
  trailing = "bookmark",
}: CancioneroCardSkeletonProps) {
  // CancioneroItemCard vs MisCanciones (Favoritas) usan layouts distintos.
  const isFavoritas = trailing === "listPlus";

  return (
    <div
      className={`rounded-[12px] border border-border-card bg-bg-card px-3 ${
        isFavoritas ? "py-3" : "py-2.5"
      }`}
      aria-hidden="true"
    >
      <div
        className={`flex ${
          isFavoritas ? "items-center gap-3" : "items-end gap-2.5"
        }`}
      >
        <div
          className="cancionero-skeleton-shimmer size-6 shrink-0 rounded-md"
          style={{ animationDelay: `${shimmerDelayMs}ms` }}
        />
        <div
          className={`min-w-0 flex-1 space-y-1.5 ${
            isFavoritas ? "" : "pb-px"
          }`}
        >
          <div
            className={`cancionero-skeleton-shimmer h-[17px] rounded-md ${titleWidth}`}
            style={{ animationDelay: `${shimmerDelayMs + 40}ms` }}
          />
          <div
            className={`cancionero-skeleton-shimmer rounded-md ${
              isFavoritas ? "h-[14px]" : "h-[13px]"
            } ${artistWidth}`}
            style={{ animationDelay: `${shimmerDelayMs + 80}ms` }}
          />
        </div>
        {trailing === "bookmark" ? (
          <div
            className="cancionero-skeleton-shimmer mb-px size-3 shrink-0 self-end rounded-sm"
            style={{ animationDelay: `${shimmerDelayMs + 120}ms` }}
          />
        ) : null}
        {trailing === "listPlus" ? (
          <div
            className="cancionero-skeleton-shimmer size-10 shrink-0 rounded-full border border-border"
            style={{ animationDelay: `${shimmerDelayMs + 120}ms` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SectionLabelSkeleton() {
  return (
    <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
      <div className="cancionero-skeleton-shimmer size-3.5 shrink-0 rounded-sm" />
      <div className="cancionero-skeleton-shimmer h-2.5 w-28 rounded-md" />
    </div>
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
          trailing="none"
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
          trailing="none"
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

type CancioneroListSkeletonProps = {
  includeSearch?: boolean;
  cardCount?: number;
  trailing?: CardTrailing;
};

export default function CancioneroListSkeleton({
  includeSearch = true,
  cardCount = 7,
  trailing = "bookmark",
}: CancioneroListSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-live="polite"
      aria-label="Cargando canciones guardadas"
    >
      {includeSearch ? <SearchFieldSkeleton /> : null}
      <div className="app-list-grid">
        {CARD_LAYOUTS.slice(0, cardCount).map((layout, index) => (
          <CancioneroCardSkeleton
            key={index}
            titleWidth={layout.title}
            artistWidth={layout.artist}
            shimmerDelayMs={index * 90}
            trailing={trailing}
          />
        ))}
      </div>
    </div>
  );
}

type CancioneroPageSkeletonProps = {
  trailing?: CardTrailing;
  cardCount?: number;
};

/** Shell de subpágina Cancionero / Favoritas (CancioneroSubpageShell). */
export function CancioneroPageSkeleton({
  trailing = "bookmark",
  cardCount = 6,
}: CancioneroPageSkeletonProps = {}) {
  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-bg-app"
      role="status"
      aria-live="polite"
      aria-label="Cargando cancionero"
    >
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3 lg:px-8">
        <div className="app-page-container flex items-center gap-3">
          <div
            className="cancionero-skeleton-shimmer size-11 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div
            className="cancionero-skeleton-shimmer h-6 flex-1 rounded-lg"
            aria-hidden="true"
          />
          <div
            className="cancionero-skeleton-shimmer size-10 shrink-0 rounded-full"
            aria-hidden="true"
          />
        </div>
      </header>

      <main className="app-page-main flex flex-col gap-3 px-4 py-4 pb-24 lg:px-8 lg:py-6">
        <div className="app-page-container flex flex-col gap-3 lg:gap-4">
          <SearchFieldSkeleton />
          <div className="app-list-grid">
            {CARD_LAYOUTS.slice(0, cardCount).map((layout, index) => (
              <CancioneroCardSkeleton
                key={index}
                titleWidth={layout.title}
                artistWidth={layout.artist}
                shimmerDelayMs={index * 90}
                trailing={trailing}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function FavoritasPageSkeleton() {
  return <CancioneroPageSkeleton trailing="listPlus" cardCount={5} />;
}

export const CancioneroSubpageSkeleton = CancioneroPageSkeleton;
