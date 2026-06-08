<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Layout: letra activa (sala)

**Leer esta sección antes de editar** `SalaPageShell.tsx`, `CancionActivaSection.tsx`, `ColaBottomSheet.tsx`, `LetraViewer.tsx` o `lib/sala-layout.ts`.

### Causa raíz del bug (jun 2026)

El `main` quedaba con ~82px de altura porque el panel de cola en `ColaBottomSheet.tsx` tenía **`fixed` y `relative` a la vez**. Eso lo mantenía en el flujo del documento y le robaba ~582px al `main`. Sin altura real, `flex-1` no funciona: letra e iframe quedaban comprimidos.

### Reglas obligatorias

1. **`ColaBottomSheet` — panel del drawer**
   - Solo `fixed`. **Nunca** `relative` (ni otra posición) en el mismo nodo que `fixed`.
   - La cola no debe competir en el flex del `main`.

2. **`SalaPageShell` — cadena de altura**
   - Raíz: `style={{ height: "100dvh" }}` + `flex flex-col overflow-hidden`.
   - `main`: `flex min-h-0 flex-1 flex-col overflow-hidden`.
   - No envolver `SalaPageShell` en un div con altura limitada en `app/salas/[id]/page.tsx`.

3. **`CancionActivaSection` — una sola `<section>`**
   - Siempre: `flex h-full min-h-0 flex-1 flex-col`.
   - **Texto** (acordesdcanciones / lacuerda / manual): `overflow-y-auto` + `paddingBottom: LETRA_SECTION_BOTTOM_PADDING`.
   - **Embed** (Cifra Club): `overflow-hidden`, **sin** `paddingBottom` en la section.
   - Embed: contenedor `shrink-0` con `height: LETRA_EMBED_HEIGHT_CSS` + `LetraViewer fill`.
   - Texto: `LetraTexto` con `shrink-0`; scroll en la section, no en un cuadrito interno.

4. **`lib/sala-layout.ts`**
   - Usar `LETRA_SECTION_BOTTOM_PADDING` y `LETRA_EMBED_HEIGHT_CSS`; no hardcodear px del inspector (ej. 106).
   - `LETRA_SCROLL_BOTTOM_EXTRA_PX = 16` (aire al final del scroll, además de la barra de 60px).

5. **Contenido dual** (`lib/letra-display.ts`)
   - Acordes / La Cuerda → hoja blanca (`LetraTexto`).
   - Cifra Club → iframe embebido **dentro de la app** (no links externos como solución principal).

### Prohibido sin prueba en 2 canciones + 2 dispositivos

- Mezclar `fixed` + `relative` en overlays de cola.
- `h-full` / `LetraViewer fill` sin altura explícita en el padre (embed usa `LETRA_EMBED_HEIGHT_CSS`).
- `padding-bottom` en section con `overflow-hidden` (no reserva espacio visible para embed).
- Reemplazar la section única por varios `return` con layouts distintos (grid, flex-1 encadenado, etc.).
- Mandar al usuario fuera de la app para ver letras.

### Verificación rápida

En consola del navegador:

```js
document.querySelector("main")?.offsetHeight
```

Debe ser ~600–700px en móvil, **no ~80px**.

Probar siempre:

- **Te Quiero – Hombres G** (Cifra Club): iframe grande hasta la barra «En fila».
- **La M.O.D.A – Ojalá** (Acordes de Canciones): hoja blanca, scroll de pantalla.

### Commits de referencia (estado estable)

- `70ddc07` — quitar `relative` del panel fixed (causa raíz).
- `818e50d` — `height: 100dvh` inline en raíz de sala.
- `8a700fc` — embed con `LETRA_EMBED_HEIGHT_CSS`.

