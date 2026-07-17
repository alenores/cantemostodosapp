<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Descripción funcional del producto

Antes de tocar código, leer `docs/descripcion-funcional.md`: inventario completo de módulos,
flujos de usuario, permisos, diferencias móvil/PC y estado del producto (sin detalle técnico).
Actualizar ese documento cuando se agregue o cambie funcionalidad visible para el usuario.

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
- **Entrenador de canciones** — página en Práctica (`/practica/entrenador-canciones`). Copia privada por usuario (`canciones_practica`); reutiliza el Editor de canciones. Anotaciones (Canto, etc.): pendiente.

### Nomenclatura ritmo y Compositor

Usar siempre estos términos en UI y documentación (`lib/ritmo-terminologia.ts`):

| Término | Significado breve |
|---------|-------------------|
| **Tempo** | Velocidad (BPM), compartida |
| **Ciclo** | Duración compartida de la vuelta (golpes + figura del ciclo) |
| **Capa** | Piano, guitarra, batería o viento (On/Off en Practicar + edición de su línea) |
| **Evento** | Un sonido en una capa: cuándo empieza, cuánto dura, qué suena |
| **Intensidad** | Silencio / suave / medio / fuerte por golpe o evento (volumen). Constantes: `RITMO_LABEL_INTENSIDAD`, `lib/voz-intensidad.ts`. |
| **Nota** | Altura de cada golpe o evento (piano, guitarra, viento) |
| **Sonido** | Cantar o callar en cada golpe (modo Ritmo del Entrenador Vocal) |
| **Timbre** | Púa/rasguido o elemento de batería |
| **Sustento** | Duración del evento en el ciclo (pasos del bloque) |
### Roadmap Herramientas (decisiones de producto)

Documentación de dirección acordada. **No implementar** lo marcado como visión futura hasta nueva decisión explícita.

#### Metrónomo — cerrado

- Rol único: que el alumno practique **tiempos**.
- Sin selector de instrumento ni samples: el timbre del click no aporta al objetivo.
- Módulo estable; no sumar complejidad salvo bugs o mejoras menores de UX.

#### Entrenador Vocal — escalera de modos (implementado)

Carrusel horizontal con ocho slides:

| Modo | Rol |
|------|-----|
| Encajar | Pinchazo corto en una nota |
| Sostener | Una nota, mantenerla con cronómetro |
| Octavas | Misma nota en distintas octavas |
| Melodía | Varias notas por ciclo, tiempo uniforme; sin cronómetro de meta |
| Ritmo | Patrón de tiempos; sin evaluar tono |
| Ritmo-Intensidad | Patrón rítmico + intensidad por golpe; evaluar volumen de la voz |
| Ritmo-Nota | Patrón rítmico + una nota fija + evaluar tono |
| Combo | Patrón rítmico + nota distinta en cada tiempo + evaluar tono e intensidad |

Agrupación pedagógica:

- **Tono**: Encajar → Sostener → Octavas → Melodía
- **Ritmo + voz**: Ritmo → Ritmo-Intensidad → Ritmo-Nota → Combo

#### Afinador y Entrenador Vocal — detección de pitch (MOMENTO APROBADO, jul 2026)

**Estado estable acordado.** Cualquier cambio en mic/deteción/gráficos debe ser **punto por punto**, **un solo cambio**, probar en dispositivo real, y **esperar OK del usuario** antes del siguiente. No expandir alcance ni tocar varios modos a la vez.

##### Metodología de trabajo (obligatoria)

1. **Aislar** — ¿falla el mic, el gráfico, o la lógica de un modo concreto?
2. **Un cambio mínimo** — un archivo / una responsabilidad por turno, salvo OK explícito del usuario.
3. **Probar** — el usuario valida en la app antes de seguir.
4. **No asumir** — no “arreglar de más” (detección + gráfico + otros modos) por un síntoma visual.

##### Dos perfiles de mic (no mezclar)

| Perfil | Hook / entrada | Rol |
|--------|----------------|-----|
| **Afinador** | `useAfinador({ profile: "tuner" })` | Nota cromática estable; modo Prueba en UI. |
| **Entrenador vocal** | `useAfinador({ profile: "vocal" })` | Pitch para modos de voz; `detectVocalPitch` en graves. |

Archivos clave: `lib/afinador.ts`, `hooks/useAfinador.ts`, `hooks/useVoz.ts`, `lib/voz.ts`, `lib/voz-intensidad.ts`, `components/ui/entrenador-vocal/VozModeSlides.tsx`.

##### Sostener — bolita y línea (implementación aprobada)

**Principio:** la bolita y la línea comparten **un solo valor** (`holdChartCents`). La línea es la huella de la bolita. El panel **VOS** (derecha) sigue mostrando la lectura en vivo del mic; no unificar con el gráfico salvo nueva decisión.

**Algoritmo:** promedio móvil de cents respecto al objetivo + tres reglas:

1. **Cerca del promedio** (≤ `VOZ_HOLD_OUTLIER_CENTS`) → la lectura entra al promedio (glissando fino).
2. **Lejana pero breve** → va a buffer **candidato**; el gráfico **mantiene** el promedio actual (ignora picos espurios).
3. **Lejana y sostenida** (candidato estable ≥ `VOZ_HOLD_SUSTAINED_MIN_SAMPLES` y ≥ `VOZ_HOLD_SUSTAINED_PITCH_MS`) → **nuevo promedio** (cambio real de nota).

Implementación: `updateSostenerRollingChartCents` en `lib/voz.ts`; historial de Sostener en `holdHistorySamples` / `holdChartCents` dentro de `hooks/useVoz.ts`. Ritmo, Melodía y Combo siguen usando `historySamples` + `smoothChartCents` (sin promedio móvil de Sostener).

**Parámetros ajustables** (solo tocar tras probar; todos en `lib/voz.ts`):

| Constante | Valor actual | Efecto |
|-----------|--------------|--------|
| `VOZ_HOLD_ROLLING_WINDOW_MS` | 400 | Ventana del promedio móvil (ms) |
| `VOZ_HOLD_SAMPLE_INTERVAL_MS` | 100 | Intervalo entre muestras (= historial global) |
| `VOZ_HOLD_OUTLIER_CENTS` | 65 | A partir de cuánto una lectura es “lejana” |
| `VOZ_HOLD_SUSTAINED_PITCH_MS` | 280 | Tiempo sostenido para aceptar cambio de nota |
| `VOZ_HOLD_SUSTAINED_MIN_SAMPLES` | 3 | Mínimo de lecturas sostenidas |
| `VOZ_HOLD_CANDIDATE_DRIFT_CENTS` | 42 | Las lecturas candidatas deben ser parecidas entre sí |

**Prohibido sin prueba y OK explícito:**

- Volver a separar bolita (live) y línea (suavizada) en Sostener.
- Reintroducir “todo o nada” (cortar línea / ocultar bolita cuando hay inestabilidad).
- Cambiar `detectVocalPitch`, umbrales globales de RMS o `useAfinador` vocal al arreglar solo el gráfico de Sostener.
- Aplicar la lógica de Sostener a Ritmo/Melodía/Octavas/Encajar sin decisión de producto.

**Otros modos vocales (sin cambiar salvo pedido):**

- **Encajar** — `hasAudiblePitchVolume`; bolita oculta sin voz audible.
- **Octavas** — gráfico propio en `VozOctavasPractice`; no usa `holdHistorySamples`.
- **Ritmo / Melodía / Combo** — `historySamples` + `smoothChartCents` (EMA α = `VOZ_HISTORY_CENTS_EMA_ALPHA`).

#### Compositor — v2 (implementado)

- **Nombre oficial**: Compositor.
- **Rol**: armar ritmos y melodías propias del usuario (crear / experimentar), separado del Entrenador Vocal (practicar / evaluar).
- **v2 (implementado)**: ciclo compartido + **línea de tiempo por capa** (eventos con posición, sustento, intensidad, nota y timbre); superposición entre capas; motor de audio por tiempo absoluto; guardado `compositor-piece-v2` (migra desde v1).
- **Audio v3 (implementado)**: multi-sample piano densificado (Salamander cada 3ª menor C2–C6), guitarra multi-cuerda (Berklee open strings + rasguido), batería ampliada (6 timbres), capa **viento** (flauta C/E/A octavas 4–6); carga lazy por pack; tope de sustento por duración útil del sample (`lib/compositor-sample-sustain.ts`).

#### Compositor ↔ Editor de canciones — plan aprobado (jul 2026)

**Principio**: el Compositor fabrica **ciclos guardados**; el **Editor de canciones** los ordena en la canción (`compas_config`); el **Cancionero** reproduce adaptado a la tonalidad del usuario.

| Rol | Responsabilidad |
|-----|-----------------|
| **Compositor** | Un ciclo = una `CompositorPiece` guardable (plantilla reutilizable) |
| **Editor** | Referencia ciclos por compás / sección; la canción guarda el conjunto |
| **Playback cifrado** | Batería del ciclo reemplaza click genérico; melodías se transponen |

**Fases de implementación** (orden obligatorio):

1. **Fase A — Biblioteca de ciclos (batería)**  
   Guardar/listar/renombrar/eliminar ciclos (`CompositorCycle` = metadata + `CompositorPiece`). Persistencia: local (invitado) + Supabase (logueado). UI: “Guardar ciclo”, “Mis ciclos”. Sin melodías relativas aún.

2. **Fase B — Editor elige ciclo + playback batería**  
   En `BarraCompas` (o `CompasConfig`): `cycleId` opcional. Selector en editor al editar compás. Playback (`cifrado-preview-play`, `useCifradoPlayback`, preview editor): si hay ciclo con batería → motor Compositor (`scheduleDrumHit`); si no → click actual. Mapear golpes del compás ↔ pasos del ciclo.

3. **Fase C — Melodías relativas (piano, guitarra, viento)**  
   Extender modelo: `tonalidadComposicion` en el ciclo; eventos melódicos con **grado cromático 1–12** desde tónica (`lib/cifrado-escala.ts`) + octava relativa, no `Do`/`Sol` absoluto. UI Compositor: modo batería vs modo melodías; bloques muestran numeración como acordes. Resolver grado → nota al reproducir.

4. **Fase D — Playback melódico en cancionero**  
   Al reproducir canción: `tonalidadPlayback = tonalidadUsuario`; transponer eventos melódicos como acordes (`semitonos = playback - tonalidadComposicion`). Capas opcionales On/Off en visor.

5. **Fase E (futuro)** — Entrenador Vocal + ciclos; import MIDI → ciclos; arrastrar bloques en timeline.

**Tipos canónicos (dirección)**:

```ts
// Ciclo guardado (Fase A)
type CompositorCycle = {
  id: string;
  nombre: string;
  piece: CompositorPiece; // v2 hoy; v3 con grados en Fase C
  createdAt: string;
  updatedAt: string;
};

// Referencia en canción (Fase B)
// BarraCompas.cycleId?: string | null;

// Evento melódico v3 (Fase C) — alternativa a note absoluta
// gradoCromatico: 1..12; octavaRelativa: number;
// tonalidadComposicion: NotaIndex en CompositorPiece o CompositorCycle
```

**Archivos clave por fase**: `lib/compositor.ts`, `lib/compositor-cycles.ts` (nuevo), `lib/cifrado.ts` (`BarraCompas`), `lib/cifrado-preview-play.ts`, `hooks/useCifradoPlayback.ts`, `components/ui/CifradoEditor.tsx`, Supabase tabla `compositor_ciclos` o JSON en perfil.

- **Pendiente (otros)**: integración Entrenador Vocal, arrastrar bloques en línea de tiempo, import MIDI.

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




## tipo de respuesta de CURSOR 
no respodner con tecnisismo de porgramacion. no se debe nomnbrar archivos ni funciones, ni cuestiones tecnicas. El usuario no entiende de porgramacion, por lo cual hauy que hacer minimas referencias con vocabulario en criollo. 
cuando el usuario pone "#TECNICO" dentro del texto de su pormpt, es la unica excpecion para nombrar cuestiones Tecnicas de porgramacion.
Siempre se debe responder de forma resumida, esponiendo la repsuesta armando un listado de temas y su contenido de forma acotada. sin detalles. unicamente cuando el usuario pone "#DETALLE" es cuando se debe explayar en nivel de detalle profundo.