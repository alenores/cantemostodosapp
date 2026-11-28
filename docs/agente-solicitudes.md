# Regla del agente — Solicitudes de canciones (NO NEGOCIABLE)

Vigente desde 2026-11-26. Vale **siempre** que un agente procese solicitudes, lo dispare Ale a
mano («procesá las solicitudes») o una tarea programada. El procedimiento es el mismo.

## Qué es

Las personas con cuenta piden canciones desde la app (tarjeta **Solicitar canción**). Cada
pedido es una fila en `public.solicitudes_canciones` (proyecto Supabase `cantemostodosapp`).
El agente las carga al Cancionero **con el procedimiento de `docs/agente-carga-canciones.md`**
(fuentes, herramienta de conversión, formato, artista, controles). Este documento solo agrega
lo propio de las solicitudes.

**Disparador:** Ale escribe «procesá las solicitudes» en una sesión de este proyecto. Antes de
empezar: leer los dos documentos, instalar las dependencias si no está la carpeta `node_modules`
(`npm ci --ignore-scripts`) y correr `node scripts/carga-canciones/probar.mjs` (tiene que decir «✓»).

## Estados (columna `estado`)

| Estado | Lo pone | Significado | Campanita a quien pidió |
|--------|---------|-------------|-------------------------|
| `pendiente` | la app | Esperando al agente | — |
| `cargada` | agente / Ale | Se cargó; `cancion_id` = la canción nueva | Sí |
| `ya_existia` | agente | Ya estaba en el Cancionero; `cancion_id` = esa canción | Sí |
| `en_revision` | agente | No se pudo cargar; la revisa Ale | No |
| `no_se_pudo` | Ale | Ale decidió que no se puede | Sí |

La campanita se enciende sola con `aviso_visto = false`. Siempre poner `aviso_visto = false` y
`procesada_en = now()` al cambiar el estado.

## Procedimiento, una por una y por orden de llegada

1. **Leer las pendientes:**

   ```sql
   select id, nombre, artista, artista_id, user_id
   from public.solicitudes_canciones
   where estado = 'pendiente'
   order by created_at;
   ```

2. **¿Ya existe en el Cancionero?** Primero el control de la base, después el control habitual
   del agente (nombres parecidos, otro nombre del artista, errores de tipeo):

   ```sql
   select public.buscar_duplicado_solicitud('<nombre>', '<artista>', <artista_id o null>);
   ```

   Solo cuenta un resultado con `"tipo": "cancionero"`. Un resultado `"tipo": "solicitud"` es la
   misma solicitud: ignorarlo.

   **El control de la base solo atrapa el mismo nombre** (sin tildes ni signos): «callejeros de
   boedo» no encuentra «Callejero de Boedo». Por eso **siempre** hacer también la búsqueda manual
   de `docs/agente-carga-canciones.md` (sección 2b: fragmentos del título y del artista con `ilike`)
   antes de decidir que no existe. Pasó con la solicitud #1.

3. **Si ya existe:** no cargarla de nuevo y **no tocar la canción existente** (ni letra, ni autor:
   el avatar sigue siendo el de quien la cargó primero).

   ```sql
   update public.solicitudes_canciones
   set estado = 'ya_existia', cancion_id = <id existente>, aviso_visto = false, procesada_en = now()
   where id = <solicitud> and estado = 'pendiente';
   ```

4. **Si no existe:** cargarla con `docs/agente-carga-canciones.md` (sin validar, en edición
   avanzada, como cualquier canción que carga el agente), con estas dos diferencias:
   - `canciones_guardadas.user_id` = `user_id` de la solicitud (en la herramienta: `--user-id`). La canción queda **agregada por
     quien la pidió** (su avatar en el Cancionero), aunque sea de la categoría público.
   - Vincular el artista (`artista_id`) como siempre; si la solicitud trae `artista_id`, usarlo.
   - Si la fuente atribuye la canción a **otro artista** que el pedido, **no inventar ni cargarla en
     silencio**: preguntarle a Ale (o dejarla `en_revision`). La solicitud conserva el artista que
     escribió la persona (no se edita). Decisión de Ale (2026-11-28): **Serú Girán, Sui Generis y
     Charly García se tratan como el mismo artista**; si el pedido es de uno de los tres y la fuente
     la lista bajo otro de los tres, se carga con el artista que dice la fuente. Ejemplo: «Rezo por
     vos» pedida como Serú Girán se cargó como Charly García (canción 4577).

   Después:

   ```sql
   update public.solicitudes_canciones
   set estado = 'cargada', cancion_id = <id nuevo>, aviso_visto = false, procesada_en = now()
   where id = <solicitud> and estado = 'pendiente';
   ```

5. **Si no se pudo cargar** (no hay letra confiable, no existe la canción, el pedido es basura):

   ```sql
   update public.solicitudes_canciones
   set estado = 'en_revision', procesada_en = now()
   where id = <solicitud> and estado = 'pendiente';
   ```

   Ale la ve en la pestaña **Revisar** y decide: la carga desde el editor (se vincula sola), la
   vincula a una canción que ya existe, o la marca «No se puede».

## Prohibido

- Borrar solicitudes o cambiar su nombre/artista.
- Tocar solicitudes que no estén en `pendiente`.
- Cargar una canción que ya está en el Cancionero o pisar la existente.
- Dejar una solicitud procesada sin `cancion_id` cuando el estado es `cargada` o `ya_existia`.

## Al terminar

Informar a Ale en criollo: cuántas cargadas, cuántas ya estaban y cuáles quedaron en revisión
(con el motivo).
