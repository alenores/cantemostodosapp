const fs = require('fs');

let cp = fs.readFileSync('lib/canciones-practica.ts', 'utf8');
cp = cp.replace(/\|\s*"artista"`n\s*\|\s*"artista_id"/g, '| "artista"\n  | "artista_id"');
cp = cp.replace(/artista: cancion.artista,`n\s*artista_id: null,/g, 'artista: cancion.artista,\n        artista_id: null,');
cp = cp.replace(/artista: cancion.artista \|\| null,`n\s*artista_id: null,/g, 'artista: cancion.artista || null,\n        artista_id: null,');
cp = cp.replace(/artista: null,`n\s*artista_id: null,/g, 'artista: null,\n    artista_id: null,');
cp = cp.replace(/artista: record.artista,`n\s*artista_id: record.artista_id,/g, 'artista: record.artista,\n      artista_id: record.artista_id,');
fs.writeFileSync('lib/canciones-practica.ts', cp);

let t = fs.readFileSync('types/index.ts', 'utf8');
t = t.replace(/artista: string \| null;`n\s*artista_id: string \| null;/g, 'artista: string | null;\n  artista_id: string | null;');
fs.writeFileSync('types/index.ts', t);

let odp = fs.readFileSync('lib/offline/offline-db.ts', 'utf8');
odp = odp.replace(/artista: string \| null;`n\s*artista_id: string \| null;/g, 'artista: string | null;\n  artista_id: string | null;');
fs.writeFileSync('lib/offline/offline-db.ts', odp);
