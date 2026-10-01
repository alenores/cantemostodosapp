const fs = require('fs');

let content = fs.readFileSync('components/cancionero/CancioneroItemCard.tsx', 'utf8');

const regex = /<div className="flex items-end gap-2\.5">[\s\S]*?<LetraFuenteIcon[\s\S]*?\/>[\s\S]*?<div className="min-w-0 flex-1 pb-px">[\s\S]*?<p className="truncate text-\[17px\] font-semibold leading-tight text-text-primary">[\s\S]*?<\/p>[\s\S]*?\{cancion\.artista && \([\s\S]*?\{cancion\.artista\}<\/span>[\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replacement = `<div className="flex items-center gap-3">
        <LetraFuenteIcon
          tipo="cancionero"
          premium={cancion.tiene_cifrado_avanzado}
        />
        {artistaAvatarUrl && (
          <img src={artistaAvatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover bg-bg-card" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-tight text-text-primary">
            {cancion.nombre}
          </p>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-[13px] leading-tight text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
      </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('components/cancionero/CancioneroItemCard.tsx', content);
