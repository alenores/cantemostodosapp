# Procedimiento del agente — Carga de canciones al Cancionero

Redactado el 2026-11-26 por el agente que hizo las cargas de esta tanda, a pedido de Ale. Sirve para que
cualquier sesión nueva cargue canciones **igual** que se venía haciendo, sin depender de la memoria de una
conversación.

- Proyecto Supabase: `cantemostodosapp`, id `kkcftduexsmiirtooril`. Tabla: `public.canciones_guardadas`.
- Marca **[NO SEGURO]** = no se recuerda con certeza o no se pudo comprobar en la base. No completar el hueco
  inventando: preguntarle a Ale.
- Etiquetas: `[✅ verificado]` = leído en la base o en el repo durante la redacción; `[⚠️ NO VERIFICADO]` =
  viene de la memoria del agente o de instrucciones de Ale dadas en conversación.
- **Herramienta obligatoria:** la conversión de texto con acordes al formato de la app se hace **siempre** con
  `scripts/carga-canciones/convertir.mjs` (sección 3.5). No se escriben conversores propios.
- Decisiones de Ale del 2026-11-26 incorporadas (fuentes, «(x2)», video, foto, alias, herramienta, bajo y notas
  agregadas): ya no son [NO SEGURO].
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

[✅ decisión de Ale, 2026-11-26]

**Se puede sacar de cualquier página, sin limitación.** Lo que importa es encontrar la canción con letra y
acordes confiables. El orden es solo una **prioridad por confiabilidad** (las más populares y aceptadas primero):

1. **lacuerda.net** — `https://acordes.lacuerda.net/<artista>/<cancion>.shtml` (469 de las 507 cargas del
   agente). El índice del artista (`https://acordes.lacuerda.net/<artista>/`) lista los nombres exactos de las
   páginas: si la URL adivinada da 404, mirar el índice antes de rendirse.
2. **acordesdcanciones.com** (21 cargas).
3. **Ultimate Guitar** (`tabs.ultimate-guitar.com`, 16 cargas): el texto está en el JSON `js-store` de la página;
   los acordes vienen como `[ch]X[/ch]` (quitar las marcas antes de convertir).
4. **Cualquier otra** (ej. acordesweb.com, 1 carga), si las anteriores no la tienen o están peor.

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
- Repeticiones «(x2)» [✅ decisión de Ale]: se **quitan de la línea de acordes** y se **dejan en el texto**
  (intro, rótulos, letra), como se venía haciendo.

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
- `bassNoteIndex` (opcional): **bajo** del acorde con barra. `LAm/SOL` → `noteIndex 9, modifier "m", bassNoteIndex 7`.
- `agregada` (opcional): **nota agregada** (2, 4, 6, 9, 11 o 13), se ve como número chico. `DO9` → `DO7₉`
  (`modifier "7", agregada 9`); `SOLadd4` → `SOL₄`.
- [✅ decisión de Ale] **Bajo y nota agregada se usan siempre** que la fuente los traiga: la app los muestra. Antes
  se tiraban (casi ninguna carga los tiene); desde ahora no.
- Orden: por línea y columna. Dos acordes no pueden pisarse (ver 3.5).

### 3.4 El `compas_config` [✅ verificado — idéntico en 4565, 4570, 4575]

```json
{"bpm":120,"barras":[],"tipoCompas":"4-4","cycleGolpes":4,"barrasVersion":2,
 "intensidadPlantilla":["fuerte","medio","medio","medio"]}
```

Es siempre el mismo, para toda canción cargada por el agente. No se calcula tempo ni compás por canción.

### 3.5 Convertir: siempre con la herramienta del proyecto

[✅ verificado — probada contra la canción 4575: resultado idéntico acorde por acorde]

```bash
node scripts/carga-canciones/probar.mjs            # primero: tiene que decir «✓»
node scripts/carga-canciones/convertir.mjs cancion.txt
```

- `cancion.txt` = el texto de la fuente tal cual: acordes en el renglón de arriba de la letra. Notación latina o
  inglesa, mayúsculas o minúsculas.
- Usa **el mismo convertidor que el editor de la app** al pegar una letra: lo que carga el agente queda igual a lo
  que carga una persona. Ya resuelve:
  - Bajo (`LAm/SOL`) y nota agregada (`DO9` → `DO7₉`).
  - Reducción de acordes que la app no tiene al más parecido (`FA#m7b5` → `FA#m7`).
  - Renglones de solo acordes (intro, solo, final) y rótulo con acordes en el mismo renglón
    («SOLO: SI FA# DO#» → acordes sobre el rótulo).
  - Limpieza de caracteres raros (BOM, comillas rizadas, letras cirílicas, `\x85`, tablatura `e|---3---|`).
- Devuelve: letra, acordes, tonalidad, modo, **avisos** (leerlos e informarlos) y **errores**. Con errores
  **no se carga**: corregir el texto de entrada (no el resultado) y volver a convertir. El error típico es
  «parece tener acordes dentro del texto»: un renglón de acordes que no se reconoció.
- Notas sueltas de solo/riff/saxo y tablatura **no** son acordes: sacarlas del texto antes de convertir.
- Si alguna vez la herramienta da algo mal: **se arregla la herramienta** (y su prueba), se anota acá, y recién
  después se sigue cargando. Nunca se corrige a mano el resultado de una sola canción.

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
- [✅ decisión de Ale] Varios videos oficiales: el **audio de estudio del canal oficial**; si hay varios, el del
  **disco original**.

### 3.9 Cómo escribir el INSERT [✅ verificado — generado por la herramienta]

La misma herramienta arma el INSERT completo (letra con *dollar quoting*, acordes, compás fijo, tonalidad, modo):

```bash
node scripts/carga-canciones/convertir.mjs cancion.txt --sql \
  --nombre "<Nombre>" --artista "<Artista>" --artista-id <uuid> --url <url de la fuente> \
  [--youtube <url>] [--user-id <uuid>]
```

- Sin `--user-id` queda a nombre de Ale. Si viene de una **solicitud**, pasar el `user_id` de la solicitud.
- Ejecutar el `sql` que devuelve **tal cual**, una sentencia por vez (el MCP de Supabase devuelve solo el
  resultado de la última). Comprobar el `returning`: id, cantidad de acordes = `cantidad_acordes`.
- Cargar **de a 5 canciones por lote** y verificar (sección 6) antes del siguiente.

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
- [✅ decisión de Ale] Se deja el **link directo de Wikipedia/Wikimedia** (hoy 103 artistas así; 162 tienen la
  foto subida desde la app). No hace falta subirla al almacenamiento de la app.
- **Otros nombres del artista** van en la tabla `artistas_alias` (`artista_id`, `alias`, `alias_norm`).
  [✅ decisión de Ale] **El agente los puede crear**, siempre revisando antes que no estén repetidos: ni como
  alias (de este u otro artista) ni como nombre de un artista.

  ```sql
  -- 1) ¿Ya existe ese nombre?
  select 'alias' t, artista_id::text, alias from artistas_alias
   where public.normalizar_texto_solicitud(alias) = public.normalizar_texto_solicitud('<alias>')
  union all
  select 'artista', id::text, nombre from artistas
   where public.normalizar_texto_solicitud(nombre) = public.normalizar_texto_solicitud('<alias>');
  ```

  2) Si no hay nada, crearlo con la herramienta (arma `alias_norm` igual que la app) y ejecutar el `sql` que devuelve:

  ```bash
  node scripts/carga-canciones/alias.mjs "<otro nombre>" <artista_id>
  ```

  Si aparece repetido, no se crea y se informa.

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
    el contenedor; hubo que reescribirlos. → [✅ decisión de Ale] La herramienta vive en el proyecto
    (`scripts/carga-canciones/`) y es la única que se usa.
13. **Tonalidad en las primeras cargas:** 31 de las 507 canciones del agente (las primeras, ids 4000–4053
    aprox.) no tienen la tonalidad del primer acorde. → Para lo nuevo manda la regla de 3.6 (la calcula la
    herramienta). Las viejas no se tocan.
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

**3. Pendiente de verificación:**

- Ninguno de los [NO SEGURO] originales: los resolvió Ale el 2026-11-26 (fuentes, «(x2)», video, foto, alias,
  herramienta). Quedan como **no verificadas** (de memoria del agente) las secciones 0, 7 y 8: se confirman con el
  uso.

**Revisión del 2026-11-26 contra la base:** 507 canciones del agente (ids ≥ 4000, con fuente, a nombre de Ale):
todas en edición avanzada, sin validar, con artista y compás idéntico; tipos de acorde = los de la app; 476 con
tonalidad = primer acorde; 58 acordes con nota agregada y ninguno con bajo. La herramienta reproduce exacta la
canción 4575.
