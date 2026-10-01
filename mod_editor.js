const fs = require('fs');
const path = 'components/ui/CifradoEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add artistaId state
content = content.replace(
  'const [artista, setArtista] = useState("");',
  'const [artista, setArtista] = useState("");\n  const [artistaId, setArtistaId] = useState<string | null>(() => session?.artista_id ?? null);'
);

// 2. Change selects to use artistaId
const select1 = `<select
                    id="cifrado-artista"
                    value={artista}
                    onChange={(event) => setArtista(event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Sin artista / Seleccionar...</option>
                    {artistas.map(a => (
                      <option key={a.id} value={a.nombre}>{a.nombre}</option>
                    ))}
                  </select>`;

const select1Rep = `<select
                    id="cifrado-artista"
                    value={artistaId || ""}
                    onChange={(event) => {
                      const id = event.target.value || null;
                      setArtistaId(id);
                      setArtista(id ? (artistas.find(a => a.id === id)?.nombre || "") : "");
                    }}
                    className={inputClassName}
                  >
                    <option value="">Sin artista / Seleccionar...</option>
                    {artistas.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>`;

const select2 = `<select
                        id="cifrado-artista-ingreso"
                        value={artista}
                        onChange={(event) => setArtista(event.target.value)}
                        className={inputClassName}
                      >
                        <option value="">Sin artista / Seleccionar...</option>
                        {artistas.map(a => (
                          <option key={a.id} value={a.nombre}>{a.nombre}</option>
                        ))}
                      </select>`;
const select2Rep = `<select
                        id="cifrado-artista-ingreso"
                        value={artistaId || ""}
                        onChange={(event) => {
                          const id = event.target.value || null;
                          setArtistaId(id);
                          setArtista(id ? (artistas.find(a => a.id === id)?.nombre || "") : "");
                        }}
                        className={inputClassName}
                      >
                        <option value="">Sin artista / Seleccionar...</option>
                        {artistas.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>`;

content = content.replace(select1, select1Rep);
content = content.replace(select1.replace(/\n/g, '\r\n'), select1Rep);
content = content.replace(select2, select2Rep);
content = content.replace(select2.replace(/\n/g, '\r\n'), select2Rep);

// 3. Fix handleSave logic
const saveLogic = `          await updateCancionCifradoAvanzado(supabase, editingId, {
            nombre: payload.nombre,
            artista: payload.artista,
            letra: payload.letra,
            bpm_default: payload.bpm_default,
          });`;
const saveLogicRep = `          await updateCancionCifradoAvanzado(supabase, editingId, {
            nombre: payload.nombre,
            artista: payload.artista,
            artista_id: artistaId,
            letra: payload.letra,
            bpm_default: payload.bpm_default,
          });`;

content = content.replace(saveLogic, saveLogicRep);
content = content.replace(saveLogic.replace(/\n/g, '\r\n'), saveLogicRep);

const insertLogic = `          const { data: inserted, error: saveError } = await supabase
            .from("canciones_guardadas")
            .insert({
              sala_id: null,
              nombre: payload.nombre,
              artista: payload.artista,
              letra: payload.letra,`;
const insertLogicRep = `          const { data: inserted, error: saveError } = await supabase
            .from("canciones_guardadas")
            .insert({
              sala_id: null,
              nombre: payload.nombre,
              artista: payload.artista,
              artista_id: artistaId,
              letra: payload.letra,`;

content = content.replace(insertLogic, insertLogicRep);
content = content.replace(insertLogic.replace(/\n/g, '\r\n'), insertLogicRep);

fs.writeFileSync(path, content, 'utf8');
console.log('CifradoEditor modified.');
