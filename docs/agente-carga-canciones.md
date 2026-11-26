# Procedimiento del agente — Carga de canciones al Cancionero

Redactado el 2026-11-26 por el agente que hizo las cargas de esta tanda, a pedido de Ale. Sirve para que
cualquier sesión nueva cargue canciones **igual** que se venía haciendo, sin depender de la memoria de una
conversación.

- Proyecto Supabase: `cantemostodosapp`, id `kkcftduexsmiirtooril`. Tabla: `public.canciones_guardadas`.
- Marca **[NO SEGURO]** = no se recuerda con certeza o no se pudo comprobar en la base. No completar el hueco
  inventando: preguntarle a Ale.
- Etiquetas: `[✅ verificado]` = leído en la base o en el repo durante la redacción; `[⚠️ NO VERIFICADO]` =
  viene de la memoria del agente o de instrucciones de Ale dadas en conversación.
- Este documento **no reemplaza** `docs/agente-solicitudes.md` (solicitudes que piden las personas desde la app):
  esa regla usa este proceso para cargar y le suma sus propias reglas.

---

## 0. Reglas generales de trabajo (de Ale)

[⚠️ NO VERIFICADO — instrucciones de Ale dadas en conversación]

- Solo se cargan canciones que tengan **letra Y acordes** de la fuente. Los acordes van **como en la fuente**:
  no se inventan ni se «corrigen» por criterio propio (única excepción: la reducción de la sección 3.5).
- Si no hay acceso a la base (el MCP de Supabase muestra otro proyecto, o falla), no avanzar ni ofrecer
  alternativas: responder exactamente
  `[BLOQUEO] No tengo acceso en tiempo real a: [fuente específica]. No puedo avanzar hasta tenerlo. ¿Cómo me lo das?`
  y esperar. Ale vuelve a activar la conexión y se reintenta.
- Respuestas a Ale **cortas, en criollo, en lista**. Contestar solo lo que preguntó. Opciones siempre como
  «Opción A) … / Opción B) …» en líneas separadas, en texto plano.
- Los borradores (PR) no se vigilan: ver `AGENTS.md` (crear el borrador, desuscribirse enseguida, sin
  recordatorios ni tareas diferidas).
- Un cambio de formato o de procedimiento de carga se anota en este documento antes de cerrar la sesión.

---

## 1. De dónde salen la letra y los acordes

[⚠️ NO VERIFICADO — memoria del agente; el orden exacto de preferencia es [NO SEGURO]]

Sitios aceptados (los únicos que se usaron):

1. **lacuerda.net** — `https://acordes.lacuerda.net/<artista>/<cancion>.shtml`. Fue la fuente más usada.
   El índice del artista (`https://acordes.lacuerda.net/<artista>/`) lista los nombres exactos de las
   páginas: el nombre de la canción en la URL no siempre coincide (ej. «Callejero de Boedo» es
   `callejero_de_boedo`, no `…_boedos`). Si la URL adivinada da 404, mirar el índice antes de rendirse.
2. **acordesdcanciones** (acordesdcanciones.com) — alternativa cuando lacuerda no la tiene.
3. **Ultimate Guitar** (`tabs.ultimate-guitar.com`) — último recurso. Se busca la canción en su buscador,
   se toma el JSON `js-store` de la página y de ahí el texto de la tablatura, donde los acordes vienen
   como `[ch]X[/ch]`. Se usó para «Prohibido» de Callejeros.

**[NO SEGURO]:** si el orden de preferencia entre acordesdcanciones y Ultimate Guitar era una regla fija o
una elección canción por canción. Lo usado en la práctica: lacuerda → (acordesdcanciones) → Ultimate Guitar.

**Se descarta una fuente cuando:**

- No tiene letra **y** acordes (solo letra, o solo tablatura/riffs).
- Los acordes son notas sueltas de solo/saxo/riff en vez de acordes (pasó con «Prohibido» en lacuerda: se
  usó Ultimate Guitar).
- La letra está cortada o mezclada con otra canción.
- Hay varias versiones: se usa la más completa y limpia, no se mezclan.

**Si ninguna fuente sirve:** la canción no se carga y se informa el motivo (sección 7).

---

## 2. Verificar que la canción no esté ya cargada

[✅ verificado — función `buscar_duplicado_solicitud`, tabla `artistas_alias` y consultas del agente]

Siempre **antes** de armar nada. Tres controles:

**a) Control de la base** (ignora tildes, mayúsculas, espacios y signos; mira artista, nombre oficial del
artista y apodos de `artistas_alias`):

```sql
select public.buscar_duplicado_solicitud('<nombre>', '<artista>', <artista_id o null>);
```

Solo cuenta un resultado `"tipo": "cancionero"` (uno `"tipo": "solicitud"` es otra cosa: ver
`docs/agente-solicitudes.md`).

**b) Control manual con nombres parecidos y errores de tipeo** (el control a) exige nombre igual una vez
normalizado; no atrapa «Elisabet» vs «Elizabeth», ni título con subtítulo):

```sql
select 'a' t, id::text i, nombre n, avatar_url x from artistas
 where nombre ilike '%<parte del artista>%'
union all
select 'c', id::text, nombre, artista from canciones_guardadas
 where artista ilike '%<parte del artista>%' or nombre ilike '%<parte del título>%';
```

Usar fragmentos cortos y variantes: `_` como comodín de un carácter para tildes dudosas
(`'%rat_n%'`, `'%jord_n%'`), las dos grafías posibles, y el título sin artículos.

**c) Otro nombre del artista:** mirar `artistas_alias` (columnas `artista_id`, `alias`, `alias_norm`). Ejemplos
reales: «indio» y «redondos» → Patricio Rey y sus Redonditos de Ricota; «Potro» → Rodrigo Bueno.

Si ya existe: **no se carga de nuevo ni se pisa la existente**. Se avisa a Ale con el id. Si Ale pide
repararla, se carga la nueva y recién después se borra la vieja (sección 7.3).

---

## 3. Armar la canción en la base

### 3.1 Qué columnas se llenan [✅ verificado — `information_schema` y filas 4565, 4570, 4575]

| Columna | Qué va | Notas |
|---------|--------|-------|
| `id` | **NO escribir** | Es `GENERATED BY DEFAULT AS IDENTITY`. Nunca `OVERRIDING SYSTEM VALUE`. Ver 3.7. |
| `sala_id` | `null` | Cancionero global (la consulta de duplicados ya filtra `sala_id is null`). |
| `nombre` | título con tildes y mayúsculas normales | NOT NULL. |
| `artista` | nombre del artista (texto) | Igual al de `artistas.nombre`. |
| `artista_id` | uuid del artista | Ver sección 4. |
| `url_letra` | URL exacta de la fuente | `null` si no hay (ej. canción cargada desde texto pegado). |
| `letra` | texto **sin acordes** (ver 3.2) | |
| `cifrado` | jsonb `{"version":1,"acordes":[…]}` (ver 3.3) | |
| `compas_config` | jsonb fijo (ver 3.4) | |
| `tiene_cifrado_avanzado` | `true` | NOT NULL, por defecto `false`. **Siempre `true`** en estas cargas. |
| `tonalidad_default` | smallint 0–11 | Nota del **primer acorde** (ver 3.6). |
| `modo_tonal_default` | `'mayor'` o `'menor'` | NOT NULL; CHECK solo admite esos dos. |
| `bpm_default` | `null` | En las cargas del agente queda `null`; el tempo vive en `compas_config.bpm = 120`. |
| `youtube_url` | `https://www.youtube.com/watch?v=<id>` o `null` | Ver 3.8. |
| `user_id` | ver sección 5 | |
| `validada_por`, `validada_en` | `null` | Ver sección 5. |
| `created_at`, `updated_at` | por defecto | No escribir. |

### 3.2 La `letra` [⚠️ NO VERIFICADO en detalle — reglas del agente]

- La letra queda **sin acordes** en el texto. Los acordes viven solo en `cifrado`.
- Una línea de acordes sin letra debajo (intro, solo, final) queda como línea con texto vacío o con su rótulo
  («SOLO:», «FINAL:»), con los acordes puestos en `charOffset` sobre esa línea. Así se cargó «Callejero de
  Boedo» (línea 1 vacía con acordes en offsets 7, 11, 14, 18).
- Se conservan los rótulos y anotaciones útiles del autor («Intro:», «Estribillo», «x2»). Se quitan: firmas,
  mails, dedicatorias, «transcripto por…», líneas de tablatura (`e|---3---|`), numeritos de dedos.
- Se arreglan caracteres raros de la fuente: BOM, letras cirílicas que parecen latinas, comillas rizadas,
  `\x85 \x91 \x92` (ver sección 8).
- Los apóstrofes de la letra van como `'` normal (ej. `rock 'n roll`).
- **[NO SEGURO]:** si hay que quitar también las repeticiones tipo «(x2)» pegadas a la letra. En lo cargado
  se dejaron los `(X 3)` de las líneas de intro y se quitaron los de la línea de acordes.

### 3.3 El `cifrado` [✅ verificado — filas 4565, 4570, 4575]

```json
{"version":1,"acordes":[
  {"lineIndex":0,"charOffset":7,"noteIndex":9,"modifier":"5"}
]}
```

- `lineIndex`: número de línea de `letra` (desde 0), contando líneas vacías.
- `charOffset`: columna dentro de esa línea donde cae el acorde (puede pasar el largo del texto).
- `noteIndex`: 0=DO, 1=DO#, 2=RE, 3=RE#, 4=MI, 5=FA, 6=FA#, 7=SOL, 8=SOL#, 9=LA, 10=LA#, 11=SI.
  Bemoles se pasan a sostenidos (SOLb → FA#, SIb → LA#).
- `modifier` admitidos: `''` (mayor), `m`, `7`, `m7`, `5`, `maj7`, `sus4`, `dim`, `6`, `sus2`, `aug`. Cualquier
  otro **no** lo acepta la app (ver 3.5).
- Orden: por línea y columna. Dos acordes no pueden pisarse (ver 3.5).

### 3.4 El `compas_config` [✅ verificado — idéntico en 4565, 4570, 4575]

```json
{"bpm":120,"barras":[],"tipoCompas":"4-4","cycleGolpes":4,"barrasVersion":2,
 "intensidadPlantilla":["fuerte","medio","medio","medio"]}
```

Es siempre el mismo, para toda canción cargada por el agente. No se calcula tempo ni compás por canción.

### 3.5 Acordes que la app no soporta, pegados o superpuestos

[⚠️ NO VERIFICADO — método acordado con Ale en conversación]

Método de **izquierda a derecha** (prefijo más largo que la app acepta):

1. Separar la raíz (`DO RE MI FA SOL LA SI` o `A–G`, con `#` o `b`) del resto.
2. Si el resto es un modificador admitido, queda tal cual.
3. Si no, **ir quitando caracteres de la derecha** hasta que el resto sea un modificador admitido; si no
   queda ninguno, queda la raíz sola (mayor).
4. `maj` es **atómico**: `maj9` → `maj` no vale → se prueba más corto, pero **nunca un acorde mayor pasa a
   menor** (si el acorde empezaba con `maj` y el recorte da `m…`, se descarta ese recorte).
5. **Acordes con barra** (`Am/G`): se toma la nota **antes de la barra** (`Am`).
6. Tolerancias aprobadas: mayúsculas/minúsculas (`do`, `Re`, `a`), notación inglesa o latina indistinta.
7. Dos acordes **idénticos pegados** se juntan en uno. Dos **distintos que se pisan** se corren a la derecha
   conservando el orden (separación mínima de 1 carácter, contando el largo de la etiqueta, ej. `FA#` = 3).
8. Notas sueltas de solo/riff/saxo y líneas de tablatura **no** son acordes: se ignoran.

Cuando se reduce algún acorde, **avisar a Ale** cuáles y a qué quedaron.

Referencia de código (no está en el repo; los scripts se perdieron con el contenedor):

```python
SP = {'DO':0,'RE':2,'MI':4,'FA':5,'SOL':7,'LA':9,'SI':11}; EN = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
MODS = {'', 'm', '7', 'm7', '5', 'maj7', 'sus4', 'dim', '6', 'sus2', 'aug'}
def parse(tok):
    m = re.match(r'^(DO|RE|MI|FA|SOL|LA|SI|[A-G])([#b]?)(.*)$', tok)
    base = (SP.get(m[1], EN.get(m[1])) + {'#':1,'b':-1,'':0}[m[2]]) % 12
    rest = m[3]
    while rest not in MODS and rest:      # quitar de la derecha
        rest = rest[:-1]
    return base, rest
```

### 3.6 Tonalidad y modo [✅ verificado — coincide en las filas leídas]

- `tonalidad_default` = `noteIndex` del **primer acorde** de la canción.
- `modo_tonal_default` = `'menor'` si el modificador de ese primer acorde empieza con `m` y **no** con `maj`;
  si no, `'mayor'`.
- Ejemplos: Callejero de Boedo (primer acorde FA#) → 6 / mayor. Fantasía y Realidad (primer acorde FAm) →
  5 / menor.

### 3.7 Insertar sin escribir el `id`, y contador [✅ verificado — regla de Ale + consultas]

- Insertar **sin** `id`. El contador `public.canciones_guardadas_id_seq` avanza solo.
- Si por algún motivo se escribieron ids a mano, al terminar:
  `select setval('public.canciones_guardadas_id_seq',(select max(id) from public.canciones_guardadas));`
- **Nunca bajar el contador.** No tocar los contadores de otras tablas.
- Una fila de prueba se borra y se vuelve a alinear el contador con `max(id)`.

### 3.8 YouTube [⚠️ NO VERIFICADO — método del agente]

- Búsqueda: pedir `https://www.youtube.com/results?search_query=<artista>+<cancion>` y leer los `videoId` y
  títulos del resultado (cabecera `Accept-Language: es`). Una búsqueda por artista por vez.
- Preferir la **versión de estudio / audio oficial**; si no hay, una en vivo o con letra. Evitar covers de
  otras bandas.
- **Regla de Ale: si no se encuentra video, la canción se carga igual, con `youtube_url = null`**, y se avisa
  en el informe («sin video»).
- Si el video elegido es dudoso, decirlo («video flojo») en el informe.
- **[NO SEGURO]:** criterio exacto cuando hay varios videos oficiales de la misma canción (se tomó el que
  figura como audio o mezcla original).

### 3.9 Cómo escribir el INSERT [✅ verificado — consulta usada en 4570–4575]

Se usa *dollar quoting* para no escapar comillas de la letra y se arma el `cifrado` con `jsonb_build_object` a
partir de una lista `linea:offset:nota:modificador;…`. Antes de escribir, comprobar que la letra no contenga
`$L$`:

```sql
insert into canciones_guardadas
 (nombre,artista,artista_id,url_letra,letra,cifrado,compas_config,tiene_cifrado_avanzado,
  tonalidad_default,modo_tonal_default,youtube_url,user_id)
values
 ('<Nombre>','<Artista>','<artista_id>','<url_fuente>',
  $L$<letra sin acordes>$L$,
  (select jsonb_build_object('version',1,'acordes',jsonb_agg(jsonb_build_object(
      'lineIndex',split_part(x,':',1)::int,'charOffset',split_part(x,':',2)::int,
      'noteIndex',split_part(x,':',3)::int,'modifier',split_part(x,':',4)) order by o))
   from unnest(string_to_array('0:7:9:5;3:1:10:;…',';')) with ordinality t(x,o)),
  $K${"bpm": 120, "barras": [], "tipoCompas": "4-4", "cycleGolpes": 4, "barrasVersion": 2,
      "intensidadPlantilla": ["fuerte", "medio", "medio", "medio"]}$K$::jsonb,
  true, <tonalidad>, '<mayor|menor>', '<url_youtube o null>',
  '<user_id>')
returning id, nombre, jsonb_array_length(cifrado->'acordes') a, md5(letra) m;
```

Detalles: el MCP de Supabase **devuelve solo el resultado de la última sentencia** de un bloque: ejecutar
consultas de a una. Cargar **de a 5 canciones por lote**.

---

## 4. Vincular el artista

[✅ verificado — tabla `artistas` (id, nombre, avatar_url, created_at) y `artistas_alias`; creación de artistas
en esta sesión: ⚠️ NO VERIFICADO el detalle de la foto]

**Artista existente (lo normal):**

```sql
select id, nombre, avatar_url from artistas where nombre ilike '%<fragmento>%';
select id, alias from artistas_alias where alias_norm like '%<fragmento normalizado>%';
```

- Si aparece, se usa su `id` en `artista_id` y su `nombre` exacto en `artista`.
- Se mira también `artistas_alias`: «Indio Solari», «Redondos», «Potro» son apodos de artistas ya cargados.
- Para cantantes con más de una banda (ej. solista y grupo) usar el artista con el que la fuente lista la
  canción; ante la duda, preguntar a Ale.

**Artista nuevo** (solo si de verdad no existe ni como alias):

```sql
insert into artistas (nombre, avatar_url) values ('<Nombre>', '<url foto o null>') returning id, nombre;
```

- **Foto:** URL directa de la imagen de **Wikipedia/Wikimedia Commons**, en miniatura de 500 px
  (`https://upload.wikimedia.org/wikipedia/commons/thumb/…/500px-….jpg`). Se buscó en la página de Wikipedia
  del artista o de la banda.
- **Si no hay foto razonable, `avatar_url = null` y se avisa a Ale en el informe** («artista nuevo sin foto»).
  Hoy hay 81 de 346 artistas sin foto.
- Las fotos ya guardadas por la app están en el bucket `artistas-avatares` con nombre
  `<artista_id>-<timestamp>.webp` (ej. Callejeros). **[NO SEGURO]:** si el agente debe re-subir la foto de
  Wikipedia a ese bucket (no se hizo; se dejó la URL de Wikimedia) o si la app la convierte sola.
- **No existe columna de «otros nombres» en `artistas`**: los apodos van en la tabla `artistas_alias`.
  **[NO SEGURO]:** si el agente debe crear alias (en la tanda no se creó ninguno; solo se leyeron).

---

## 5. A nombre de quién queda y estado de validación

[✅ verificado — filas 4565, 4570, 4575; `validada_por` apunta a `perfiles_publicos`]

- `user_id` = `fa5ae382-2b22-4812-a486-a00ddc82d994` (perfil público «Ale nores»): **todas** las canciones
  cargadas por el agente en esta tanda.
- Excepción: si se carga por una **solicitud** de una persona, `user_id` = el de la solicitud (ver
  `docs/agente-solicitudes.md`).
- Nombre y foto del autor **no se copian** a la canción: se leen de `perfiles_publicos` por `user_id`
  (regla de `AGENTS.md`, 2026-10-21).
- `validada_por = null` y `validada_en = null`: la canción se carga **sin validar**. Validar es decisión de
  Ale; hoy hay 1 sola canción validada en todo el Cancionero. Hay un disparador
  (`trg_proteger_validacion_cancionero`) que protege esas columnas en los UPDATE: no se modifican.
- Hay otro disparador (`trg_proteger_dueno_cancion_guardada`) sobre el dueño en UPDATE. No cambiar `user_id` de
  canciones existentes.

---

## 6. Controles antes de dar la canción por terminada

[✅ verificado — consultas usadas en esta tanda]

1. **Ejecutar el INSERT con `returning`** y comprobar que devolvió un id, la cantidad de acordes esperada y el
   `md5(letra)` esperado (calculado en el script antes de insertar).
2. **Verificar en la base** (no dar por hecho que el INSERT salió bien):

   ```sql
   select id, nombre, artista, tiene_cifrado_avanzado, tonalidad_default, modo_tonal_default,
          cifrado->>'version' v, compas_config->>'tipoCompas' tc, jsonb_array_length(cifrado->'acordes') n,
          youtube_url, user_id, validada_por, artista_id
   from canciones_guardadas where id in (<ids>);
   ```

   Debe dar: `tiene_cifrado_avanzado = true`, versión `1`, compás `4-4`, `user_id` correcto,
   `validada_por` null, `artista_id` no nulo, y tonalidad/modo = primer acorde.
3. **Contador de ids** (debe cumplirse `last_value >= max(id)` con `is_called = true`):

   ```sql
   select (select max(id) from public.canciones_guardadas) as ultima_cancion, last_value, is_called,
          (select count(*) from public.canciones_guardadas) as total
   from public.canciones_guardadas_id_seq;
   ```

4. **Chequeo visual de la letra:** que no queden acordes dentro del texto, ni líneas de tablatura, ni
   caracteres raros (`replace(letra, E'\n', '⏎')` y espacios como `·` ayudan a verlos).
5. **Informe corto a Ale** (en lista): cargadas, excluidas con motivo, canciones **sin video** o con video
   flojo, acordes reducidos, artistas nuevos y si llevan foto, total del Cancionero.

---

## 7. Cuando algo falla o la canción no se puede cargar

[⚠️ NO VERIFICADO — práctica del agente]

1. **No hay acceso a la base / otro proyecto:** el texto `[BLOQUEO]` de la sección 0 y esperar.
2. **No hay letra con acordes en ninguna fuente, o los acordes no son confiables:** no se carga. Se informa
   en el resumen («excluida: sin acordes confiables»). Si es una solicitud de la app: estado `en_revision`
   (ver `docs/agente-solicitudes.md`).
3. **Reparar una canción mal guardada:** se busca de nuevo en la fuente «como si no existiera», se **inserta
   la nueva primero**, se verifica contra lo esperado, y **recién después se borra la vieja** (antes mirar
   que no tenga referencias: `usuarios_canciones` y `canciones_practica` apuntan con `ON DELETE SET NULL`).
   El id cambia (la nueva tiene uno nuevo).
4. **El INSERT falla** (NOT NULL, duplicate key): leer el error, no reintentar a ciegas. Un `duplicate key en
   canciones_guardadas_pkey` indica contador desalineado (sección 3.7). Un lote que falla no guarda nada;
   confirmar con una consulta antes de reinsertar.
5. **Falta el video:** no es motivo para no cargar (sección 3.8).
6. **Duda sobre cuál canción pidió Ale** (varias con el mismo título): **no preguntar con el título**; mostrar a
   Ale **una frase de la letra** de cada candidata y que elija.
7. **Fuentes con acordes no soportados:** aplicar el método 3.5 y avisar; no excluir la canción por eso.
8. **Canción cargada a mano desde la app** con acordes mezclados en el texto y modo avanzado roto (ver 8.7):
   NO se arregla a mano; se recarga con este proceso. Las canciones en modo simple con acordes en líneas
   aparte las arregla Ale con la función de la app: **no tocarlas**.

---

## 8. Errores ya cometidos (y cómo evitarlos)

[⚠️ NO VERIFICADO — memoria de esta sesión]

1. **Escribir ids a mano** en una tanda vieja dejó el contador en 2096 con canciones hasta el 4565: la app
   fallaba al guardar con «No se pudo guardar la canción». → Nunca escribir `id`; verificar el contador (3.7).
2. **Conexión al proyecto equivocado** del MCP de Supabase: se cargó o se estuvo por cargar donde no era. →
   Antes de cada tanda, `list_projects` y confirmar `kkcftduexsmiirtooril`; si no coincide, `[BLOQUEO]`.
3. **Fila de prueba colada en un lote**: la rechazó el NOT NULL y no se guardó nada, pero se avisó tarde. →
   Revisar el lote antes de enviarlo; si pasa, decírselo a Ale y reinsertar limpio.
4. **Caracteres invisibles o parecidos** (letras cirílicas, BOM, `\x91`, `\x85`) en las fuentes. → Limpiar con
   `translate/replace` antes de insertar y mirar la letra con los espacios visibles.
5. **Apóstrofes comidos:** «rock n roll» salió sin comilla. → Corregido con `UPDATE` (`rock 'n roll`); vigilar
   `'` en letras.
6. **Consultas de varias sentencias:** el MCP devuelve solo la última. → Una consulta por vez.
7. **Canción «Situación 1»:** acordes pegados dentro del texto de la letra con modo avanzado marcado y casi
   sin acordes en `cifrado` (pasó al cargar desde el editor con copiar y pegar). Se detecta con
   `tiene_cifrado_avanzado` y pocos acordes (<~10) pero muchas líneas que empiezan con tokens de acorde. →
   Recargar con este proceso. **Situación 2** (modo simple, acordes en líneas aparte): no la toca el agente.
8. **Sin video no se carga** (creencia equivocada del agente): la regla de Ale es cargarla igual sin video.
9. **Datos personales en servicios externos:** un correo en el `User-Agent` de un `curl` lo frenó el control de
   privacidad. → Usar siempre un cliente genérico; nunca datos de Ale en pedidos externos.
10. **Responder largo o mezclado:** Ale pidió varias veces respuestas cortas y solo sobre lo preguntado. →
    Informe en lista breve, una pregunta clave por vez.
11. **Herramientas locales perdidas:** los scripts de conversión estaban en `/tmp` y se perdieron al reiniciar
    el contenedor; hubo que reescribirlos. → Este documento describe las reglas; **[NO SEGURO]** si conviene
    guardarlos en el repositorio (decisión de Ale).
12. **URL adivinada de lacuerda:** una URL inexistente da 404 aunque la canción esté. → Leer el índice del
    artista (sección 1).

---

## 9. Ejemplos reales

[✅ verificado — leídos de la base el 2026-11-26]

**Consulta para ver cómo quedó una canción cargada por el agente:**

```sql
select id, nombre, artista, artista_id, url_letra, tiene_cifrado_avanzado, tonalidad_default,
       bpm_default, modo_tonal_default, youtube_url, user_id, validada_por, compas_config,
       jsonb_array_length(cifrado->'acordes') n, cifrado->>'version' v
from canciones_guardadas where id in (4575, 4570);
```

**Referencia 1 — id 4575, «Callejero de Boedo» (Callejeros)**

- Fuente: `https://acordes.lacuerda.net/callejeros/callejero_de_boedo.shtml`
- `artista_id` `24eb3585-d2a5-429b-86d1-3549579e8a12` (artista ya existente, con foto en `artistas-avatares`).
- 47 acordes, tonalidad 6 (FA#) / mayor, edición avanzada, versión de cifrado 1, `bpm_default` null.
- Video: `https://www.youtube.com/watch?v=ct03qViRkdk` (mezcla original 2003, disco *Presión*).
- `user_id` `fa5ae382-2b22-4812-a486-a00ddc82d994`, `validada_por` null.
- Cargada con un solo INSERT; verificada: total 3.153 canciones, `max(id)` = 4575 = `last_value` del contador.

**Referencia 2 — id 4570, «Rocanroles Sin Destino» (Callejeros)**

- Fuente: `https://acordes.lacuerda.net/callejeros/rocanroles_sin_destino.shtml`. Es una **recarga** de una
  versión vieja (id 113, ya borrada) que tenía los acordes pegados en la letra.
- 54 acordes, tonalidad 5 (FA) / mayor. Video `https://www.youtube.com/watch?v=MWwaih5U710`, **copiado** del
  registro viejo antes de borrarlo.

**Contraejemplo (no es del agente):** id 4566, «Volando» (El Bordo) fue cargada desde la app por otra
persona (`user_id` distinto, `bpm_default` 120, sin `url_letra` ni video): confirma que el resto del formato
(`cifrado` v1, `compas_config`, `tiene_cifrado_avanzado = true`) es el mismo que arma la app.

**Consulta de cierre de tanda:** la de contador de la sección 6, punto 3.

---

## Auditoría de fuentes

**1. Leído en tiempo real (esta sesión, 2026-11-26):**

- Base `kkcftduexsmiirtooril`: `information_schema.columns` de `canciones_guardadas` y `artistas`; columnas,
  ejemplos y cantidad de `artistas_alias`; disparadores, constraints e índices de `canciones_guardadas`;
  definición de `buscar_duplicado_solicitud` y `normalizar_texto_solicitud`; filas 4565, 4566, 4570 y 4575;
  conteos de validadas, artistas y artistas sin foto; perfil público de `fa5ae382-…`; verificación de
  inserción del id 4575 y del contador.
- Repositorio: `docs/agente-solicitudes.md` (de `origin/main`), listado de `docs/`, `AGENTS.md` (reglas de
  borradores y de autor).
- Registro de esta conversación (consultas SQL del agente y el prompt de Ale sobre el contador de ids).
- Página `https://acordes.lacuerda.net/callejeros/callejero_de_boedo.shtml` y resultados de YouTube usados
  para la canción 4575.

**2. Inferido (no verificado):**

- Sección 0 (reglas de trabajo de Ale) y secciones 1 (orden de fuentes), 3.2, 3.5, 3.8, 4 (método de foto),
  7 y 8: vienen de instrucciones de Ale dadas en conversaciones anteriores y de la memoria del agente, no se
  pudieron releer completas porque esa parte de la conversación ya no está disponible.
- Los scripts de conversión (`conv.py`, `build.py`, `post.py`) no están en el repositorio; el bloque de
  código de 3.5 es una reconstrucción mínima, no el script original.

**3. Pendiente de verificación (los [NO SEGURO]):**

- Orden de preferencia exacto entre acordesdcanciones y Ultimate Guitar (sección 1).
- Tratamiento de repeticiones «(x2)» pegadas a la letra (3.2).
- Criterio cuando hay varios videos oficiales de la misma canción (3.8).
- Si hay que re-subir la foto de Wikipedia al bucket `artistas-avatares` o la deja así la app (sección 4).
- Si el agente debe crear alias en `artistas_alias` (sección 4).
- Si conviene guardar los scripts de conversión dentro del repositorio (sección 8, punto 11).

Este documento NO está listo para compartir externamente hasta resolver los puntos pendientes.
