# Regla del agente — Solicitudes de canciones (NO NEGOCIABLE)

Vigente desde 2026-11-26. Vale **siempre** que un agente procese solicitudes, lo dispare Ale a
mano («procesá las solicitudes») o una tarea programada. El procedimiento es el mismo.

## Qué es

Las personas con cuenta piden canciones desde la app (tarjeta **Solicitar canción**). Cada
pedido es una fila en `public.solicitudes_canciones` (proyecto Supabase `cantemostodosapp`).
El agente las carga al Cancionero con su proceso habitual de carga de canciones.

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

3. **Si ya existe:** no cargarla de nuevo y **no tocar la canción existente** (ni letra, ni autor:
   el avatar sigue siendo el de quien la cargó primero).

   ```sql
   update public.solicitudes_canciones
   set estado = 'ya_existia', cancion_id = <id existente>, aviso_visto = false, procesada_en = now()
   where id = <solicitud> and estado = 'pendiente';
   ```

4. **Si no existe:** cargarla con el proceso habitual (sin validar, en edición avanzada, como
   cualquier canción que carga el agente), con estas dos diferencias:
   - `canciones_guardadas.user_id` = `user_id` de la solicitud. La canción queda **agregada por
     quien la pidió** (su avatar en el Cancionero), aunque sea de la categoría público.
   - Vincular el artista (`artista_id`) como siempre; si la solicitud trae `artista_id`, usarlo.

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
