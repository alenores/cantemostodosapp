<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Nomenclatura oficial del proyecto (v2)

Esta es la terminología canónica de CantemosTodosApp. Usarla siempre en código,
comentarios, nombres de componentes y prompts. No inventar sinónimos.

### Modos de pantalla
- **Modo control** — el usuario interactúa con la app. Footer visible, botones activos,
  puede buscar, abrir la cola, navegar entre secciones.
- **Modo lectura** — la letra ocupa toda la pantalla. Solo visibles: botón flotante
  y control de auto-scroll. Todo lo demás desaparece.

### Secciones principales (tabs del footer)
- **Home** — pantalla principal de uso individual. Buscador + letra + cola individual.
- **Salas** — listado de salas disponibles y sala activa.
- **Herramientas** — hub en el footer (`/cancionero`): Cancionero, Mis canciones, Afinador (y futuros submódulos).

### Subsecciones de Herramientas
- **Hub** (`/cancionero`) — pantalla de elección de submódulo.
- **Cancionero** (`/cancionero/global`) — canciones disponibles para todos los usuarios.
- **Mis canciones** (`/cancionero/mis-canciones`) — cancionero personal permanente del usuario registrado.
- **Afinador** — modal desde el hub.
- **Metrónomo** — modal desde el hub. Solo tiempo; módulo cerrado (ver roadmap).
- **Entrenador Vocal** — modal desde el hub. Carrusel de modos de práctica vocal (ver roadmap).
- **Compositor** — modal desde el hub. Ver roadmap, `lib/compositor.ts` y `lib/ritmo-terminologia.ts`.

### Nomenclatura ritmo y Compositor

Usar siempre estos términos en UI y documentación (`lib/ritmo-terminologia.ts`):

| Término | Significado breve |
|---------|-------------------|
| **Tempo** | Velocidad (BPM), compartida |
| **Ciclo** | Duración compartida de la vuelta (golpes + figura del ciclo) |
| **Capa** | Piano, guitarra o batería (On/Off en Practicar + edición de su línea) |
| **Evento** | Un sonido en una capa: cuándo empieza, cuánto dura, qué suena |
| **Dinámica** | Silencio / suave / medio / fuerte por evento |
| **Contenido** | Nota (piano, guitarra) |
| **Timbre** | Púa/rasguido o elemento de batería |
| **Sustento** | Duración del evento en el ciclo (pasos del bloque) |

### Roadmap Herramientas (decisiones de producto)

Documentación de dirección acordada. **No implementar** lo marcado como visión futura hasta nueva decisión explícita.

#### Metrónomo — cerrado

- Rol único: que el alumno practique **tiempos**.
- Sin selector de instrumento ni samples: el timbre del click no aporta al objetivo.
- Módulo estable; no sumar complejidad salvo bugs o mejoras menores de UX.

#### Entrenador Vocal — escalera de 6 modos (implementado)

Carrusel horizontal con seis slides:

| Modo | Rol |
|------|-----|
| Encajar | Pinchazo corto en una nota |
| Sostener | Una nota, mantenerla con cronómetro |
| Melodía | Varias notas por ciclo, tiempo uniforme; sin cronómetro de meta |
| Ritmo | Patrón de tiempos; sin evaluar tono |
| Ritmo-Nota | Patrón rítmico + una nota fija + evaluar tono |
| Combo | Patrón rítmico + nota distinta en cada tiempo + evaluar tono |

Agrupación pedagógica:

- **Tono**: Encajar → Sostener → Melodía
- **Ritmo + voz**: Ritmo → Ritmo-Nota → Combo

#### Compositor — v2 (implementado)

- **Nombre oficial**: Compositor.
- **Rol**: armar ritmos y melodías propias del usuario (crear / experimentar), separado del Entrenador Vocal (practicar / evaluar).
- **v2 (implementado)**: ciclo compartido + **línea de tiempo por capa** (eventos con posición, sustento, dinámica, contenido y timbre); superposición entre capas; motor de audio por tiempo absoluto; guardado `compositor-piece-v2` (migra desde v1).
- **Pendiente**: biblioteca de varias piezas guardadas, integración con Entrenador Vocal, multi-sample piano (más rangos), arrastrar bloques en la línea de tiempo.

Tres herramientas, tres preguntas:

- ¿Llego al tiempo? → Metrónomo
- ¿Canto bien en X situación? → Entrenador Vocal
- ¿Qué quiero que suene? → Compositor

### Colas
- **Cola individual** — setlist personal del momento. Vive en Home. Persistida
  en Supabase si hay sesión; en memoria (efímera) para invitados.
- **Cola de la juntada** — setlist compartido y sincronizado en tiempo real.
  Vive en Sala. Tiene botón "Siguiente" para avanzar la canción activa.

### Componentes de UI
- **Sheet** — panel que aparece desde abajo con animación suave. Usado para
  cola individual, cola de la juntada y afinador.
- **Overlay** — capa semitransparente sobre la letra. Usado en modo lectura
  para mostrar controles secundarios (buscador, afinador, footer).
- **Modal** — pantalla que cubre todo. Usado para el buscador de canciones.
- **Snackbar** — notificación breve desde abajo, desaparece automáticamente a los 3 segundos.
- **Botón flotante** — botón fijo sobre la letra, siempre visible en modo lectura.

### Estados de items en la cola de la juntada
- **tocada** — ya fue reproducida. Se muestran las últimas dos.
- **activa** — la canción que todos están viendo ahora. Fondo blanco.
- **próxima** — la primera pendiente. Muestra badge "Próx".
- **pendiente** — las siguientes en la cola. Draggables con @dnd-kit.

---

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
   - Acordes → hoja blanca (`LetraTexto`).
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

---

## Home (uso individual)

**Referencia de UX:** `SalaPageShell.tsx` (misma cadena de layout, `CancionActivaSection`, float controls, sheet de cola).

### Invitado (sin login)
- Puede buscar (General), **Ver ahora**, ver letra, modo lectura.
- **Cola efímera en memoria** (`lib/cola-individual-guest.ts`) — se pierde al recargar o cerrar.
- No puede: Guardar en cancionero, Mis canciones (pestaña deshabilitada), entrar a Salas.

### Usuario logueado
- Cola persistida en Supabase (`cola_individual`).
- Buscador Home: pestañas **General | Mis canciones**.
- Preview General: **Ver ahora · Agregar a la lista · Guardar** (cancionero).
- Tras Guardar en cancionero: prompt opcional **«¿Sumar a Mis canciones?»**.
- Preview Mis canciones: **Ver ahora · Agregar a la lista** (sin Guardar).
- **Agregar a la lista** deshabilitado si no hay activa ni pendiente en cola.

### Diferencias vs Sala
- Sin `SalaPresenceBar` ni avatares en tarjetas de cola (`showAgregadoAvatar={false}`).
- Lupa en header de modo control (`headerAction` en `CancionActivaSection`).
- Sin realtime / presence / offline cola de juntada.

### APIs lectura pública (invitados)
- `GET /api/buscar-letra` y `GET /api/obtener-letra` — sin auth (solo lectura).
- Escritura (cola, guardar) sigue requiriendo sesión.

### Commits de referencia (estado estable)

- `70ddc07` — quitar `relative` del panel fixed (causa raíz).
- `818e50d` — `height: 100dvh` inline en raíz de sala.
- `8a700fc` — embed con `LETRA_EMBED_HEIGHT_CSS`.

