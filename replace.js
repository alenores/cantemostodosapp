const fs = require('fs');
const path = 'components/cancionero/CancioneroPageClient.tsx';
let content = fs.readFileSync(path, 'utf8');

const target =           <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveCardId(null);
                }}
                placeholder="Buscar por nombre o artista..."
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className={inputClassName}
              />
            </div>;

const replacement =           <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveCardId(null);
                  }}
                  placeholder="Buscar por nombre o artista..."
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={inputClassName}
                />
              </div>
              {usuarioLogueado && (
                <TapButton
                  type="button"
                  aria-label="Gestión de Artistas"
                  onClick={() => setArtistasManagerOpen(true)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-bg-card text-text-secondary hover:text-text-primary"
                >
                  <Settings className="size-5" />
                </TapButton>
              )}
            </div>

            {artistas.length > 0 && (
              <div className="flex w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {artistas.map(a => {
                  const isSelected = selectedArtistaIds.has(a.id);
                  return (
                    <TapButton
                      key={a.id}
                      onClick={() => {
                        setSelectedArtistaIds(prev => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id);
                          else next.add(a.id);
                          return next;
                        });
                      }}
                      className={\lex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors \\}
                    >
                      {a.avatar_url && <img src={a.avatar_url} alt="" className="size-5 rounded-full object-cover" />}
                      {a.nombre}
                    </TapButton>
                  );
                })}
              </div>
            )};

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Target not found! Target was:');
  console.log(target);
}
