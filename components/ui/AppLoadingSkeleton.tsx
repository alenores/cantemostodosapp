/** También se renderiza en el HTML inicial para evitar un flash de marca. */
export default function AppLoadingSkeleton() {
  return (
    <div role="status" aria-label="Cargando pantalla" className="fixed inset-0 z-[100] bg-bg-app px-4 pt-20 lg:pl-72">
      <span className="sr-only">Cargando pantalla…</span>
      <div aria-hidden="true" className="mx-auto flex max-w-3xl flex-col gap-4 motion-safe:animate-pulse">
        <div className="h-7 w-40 rounded-lg bg-white/10" />
        <div className="h-12 rounded-xl bg-white/5" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex h-24 items-center gap-4 rounded-xl border border-white/5 p-4">
            <div className="size-10 rounded-lg bg-white/10" />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
