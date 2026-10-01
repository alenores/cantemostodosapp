const fs = require('fs');
const path = 'components/cancionero/CancioneroPageClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import for ArtistasFilterModal and change Settings to Users
content = content.replace(
  'import { ArtistasManagerModal } from "@/components/ui/ArtistasManagerModal";',
  'import { ArtistasManagerModal } from "@/components/ui/ArtistasManagerModal";\nimport { ArtistasFilterModal } from "@/components/ui/ArtistasFilterModal";'
);
content = content.replace(
  'import { Bell, Music, Search, Star, WifiOff, X, Settings } from "lucide-react";',
  'import { Bell, Music, Search, Star, WifiOff, X, Settings, Users } from "lucide-react";'
);

// 2. Add artistasFilterOpen state
content = content.replace(
  'const [artistasManagerOpen, setArtistasManagerOpen] = useState(false);',
  'const [artistasManagerOpen, setArtistasManagerOpen] = useState(false);\n  const [artistasFilterOpen, setArtistasFilterOpen] = useState(false);'
);

// 3. Replace the search bar action and remove the bubbles
const searchBarArea = `              {usuarioLogueado && (
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
                      className={\`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors \${isSelected ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-border bg-bg-card text-text-secondary hover:text-text-primary"}\`}
                    >
                      {a.avatar_url && <img src={a.avatar_url} alt="" className="size-5 rounded-full object-cover" />}
                      {a.nombre}
                    </TapButton>
                  );
                })}
              </div>
            )}`;

const searchBarAreaRep = `              <TapButton
                type="button"
                aria-label="Filtrar por Artista"
                onClick={() => setArtistasFilterOpen(true)}
                className={\`flex size-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors \${
                  selectedArtistaIds.size > 0 
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary" 
                    : "border-border bg-bg-card text-text-secondary hover:text-text-primary"
                }\`}
              >
                <Users className="size-5" />
              </TapButton>
            </div>`;

content = content.replace(searchBarArea, searchBarAreaRep);
content = content.replace(searchBarArea.replace(/\n/g, '\r\n'), searchBarAreaRep);

// 4. Add the new modal at the end, before ArtistasManagerModal
const modalsArea = `<ArtistasManagerModal 
        isOpen={artistasManagerOpen}
        onClose={() => setArtistasManagerOpen(false)}
      />`;

const modalsAreaRep = `<ArtistasFilterModal
        isOpen={artistasFilterOpen}
        onClose={() => setArtistasFilterOpen(false)}
        artistas={artistas}
        selectedIds={selectedArtistaIds}
        onApply={(ids) => {
          setSelectedArtistaIds(ids);
          setArtistasFilterOpen(false);
        }}
        onManageArtistas={() => {
          setArtistasFilterOpen(false);
          setArtistasManagerOpen(true);
        }}
      />
      
      <ArtistasManagerModal 
        isOpen={artistasManagerOpen}
        onClose={() => {
          setArtistasManagerOpen(false);
          // Opcionalmente reabrir el filtro
          // setArtistasFilterOpen(true);
        }}
      />`;

content = content.replace(modalsArea, modalsAreaRep);
content = content.replace(modalsArea.replace(/\n/g, '\r\n'), modalsAreaRep);

fs.writeFileSync(path, content, 'utf8');
console.log('CancioneroPageClient modified.');
