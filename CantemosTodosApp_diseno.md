# CantemosTodosApp — Sistema de Diseño
## Referencia visual para Cursor
## Última actualización: junio 2026

---

## 0. REGLAS PARA CURSOR (LEER PRIMERO)

1. **Plan primero.** Antes de tocar código, devolvé un PLAN: qué archivos creás/editás
   y qué hace cada uno. **Esperá el OK.** Recién con el OK, ejecutás.
2. **Tokens, no colores sueltos.** Todos los colores y tipografías van como CSS variables
   en `globals.css`. Prohibido hardcodear hex en componentes.
3. **Mobile-first obligatorio.** Esta app se usa 98% en celular. Todo se diseña
   para pantalla de 390px de ancho. Desktop es secundario.
4. **Lógica fuera del JSX.** Cálculos, transformaciones y reglas de negocio van
   en hooks o en `lib/`. No incrustados en los componentes.
5. **TypeScript estricto.** Tipar todo. Sin `any`. Sin `as unknown`.
6. Al terminar: `npm run build` verde antes de dar por hecho.

---

## 1. IDENTIDAD VISUAL

**Concepto:** "Cartel de bar de música en vivo" — moderna, con carácter,
llamativa sin ser gamer ni ciber. Pensada para usarse de noche, con poca luz
ambiente, en grupo.

**Regla de oro de la letra:** La letra de la canción activa es la estrella.
Fondo blanco puro, texto negro, tipografía grande y legible. Todo lo demás
de la UI existe para servir a esa lectura.

---

## 2. TOKENS DE COLOR

Definir en `app/globals.css` como CSS variables:

```css
:root {
  /* Base */
  --bg-app:        #2C2C2C;   /* fondo general de la app */
  --bg-dark:       #1E1E1E;   /* drawers, barras inferiores */
  --bg-darker:     #141414;   /* topbars, headers de modales */
  --bg-card:       #252525;   /* cards de items (cola, guardadas) */
  --bg-card-hover: #2A2018;   /* card hovereada o próxima en cola */

  /* Texto */
  --text-primary:  #F0F0F0;   /* texto principal */
  --text-secondary:#C0C0C0;   /* texto secundario */
  --text-muted:    #888888;   /* texto apagado, artistas, metadatos */
  --text-faint:    #555555;   /* texto muy apagado, labels */

  /* Bordes */
  --border:        #3A3A3A;   /* borde estándar */
  --border-subtle: #2A2A2A;   /* borde muy sutil */
  --border-card:   #303030;   /* borde de cards */

  /* Acento — naranja escenario */
  --accent:        #F4845F;   /* color principal de acento */
  --accent-dim:    rgba(244, 132, 95, 0.12); /* fondo suave acento */

  /* Letra activa — siempre blanco/negro */
  --letra-bg:      #FFFFFF;
  --letra-text:    #111111;

  /* Estados de cola */
  --cola-proxima-bg:     #2D2420;   /* fondo item próximo */
  --cola-proxima-border: #F4845F;   /* borde item próximo */
  --cola-tocada-opacity: 0.45;      /* opacidad items tocados */
}
```

---

## 3. TOKENS DE TIPOGRAFÍA

Fuente única: **Plus Jakarta Sans** — importar via `next/font/google`.

```typescript
// app/layout.tsx
import { Plus_Jakarta_Sans } from 'next/font/google'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-app',
})
```

Escala tipográfica:
```css
/* Headings */
--text-xs:   10px;   /* labels uppercase, badges */
--text-sm:   12px;   /* artista, metadatos */
--text-base: 14px;   /* items de lista */
--text-md:   15px;   /* nombres de canciones en resultados */
--text-lg:   17px;   /* nombre de sala en topbar */
--text-xl:   20px;   /* nombre canción activa */
--text-2xl:  16px;   /* letra de canción (legibilidad máxima) */

/* Letra de canción: tamaño prioritario */
--letra-size:        16px;
--letra-line-height: 2;
--letra-weight:      500;
```

---

## 4. LAYOUT PRINCIPAL — PANTALLA DE SALA

La pantalla tiene dos zonas fijas y un drawer:

```
┌─────────────────────────────┐
│         TOPBAR              │  altura fija ~56px
│  "Los del Viernes"    [🔍]  │  fondo: --bg-darker
├─────────────────────────────┤
│                             │
│     ZONA LETRA              │  flex: 1 (ocupa todo el espacio)
│                             │  overflow-y: auto
│  [nombre canción]           │
│  [artista]                  │
│                             │
│  ┌─────────────────────┐   │
│  │  CARD BLANCO        │   │  bg: --letra-bg
│  │  letra de la canción│   │  border-radius: 12px
│  │  en negro, grande   │   │  padding: 20px 18px
│  └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│  Cola  [3]  Próxima: ...  ↑ │  altura fija ~52px
│         BARRA COLA          │  fondo: --bg-dark, cursor pointer
└─────────────────────────────┘
         DRAWER COLA
         (se abre desde abajo,
          draggable hacia arriba
          hasta casi pantalla completa)
```

**Barra Cola:**
- Fondo: `--bg-dark`
- Borde superior: `1px solid --border`
- Muestra: label "Cola" + badge naranja con cantidad pendientes + "Próxima: [nombre]"
- Flecha que rota 180° al abrir el drawer

**Drawer Cola:**
- Se abre con animación `transform: translateY` desde abajo
- Draggable: el usuario puede arrastrarlo hacia arriba para expandirlo a pantalla completa
- Handle visual (pastilla gris) en la parte superior del drawer
- Fondo: `--bg-dark`, border-radius: 16px 16px 0 0
- Overlay semitransparente sobre la letra cuando está abierto
- Contiene: header con título + botón "+", lista scrolleable, footer con "Borrar todo"

---

## 5. COMPONENTE: CARD DE ITEM EN COLA

Tres variantes según estado:

**Tocada** (estado = 'tocada'):
```
opacity: --cola-tocada-opacity (0.45)
background: --bg-card
border: 1px solid --border-subtle
Sin botones de acción, sin drag handle
Chip "Tocada" visible
```

**Próxima** (primera con estado = 'pendiente'):
```
background: --cola-proxima-bg (#2D2420)
border: 1px solid --cola-proxima-border (#F4845F)
Con drag handle + número en --accent + botones acción
```

**Pendiente** (resto con estado = 'pendiente'):
```
background: --bg-card
border: 1px solid --border-card
Con drag handle + número en --text-faint + botones acción
```

**Estructura de cada card:**
```
[drag-handle] [número] [nombre / artista] [btn-guardar] [btn-trash]
```

**Botón guardar:** Desaparece si la canción ya está en `canciones_guardadas`.
Verificar contra el listado de guardadas antes de renderizar.

---

## 6. BUSCADOR — MODAL FULLSCREEN

Se abre desde el botón lupa del topbar.
Ocupa el 100% de la pantalla (posición absoluta, z-index alto).
El usuario que busca no necesita ver la sala.

**Pantalla 1 — Búsqueda:**
```
┌─────────────────────────────┐
│  [X]  [🔍 Buscar canción...]│  topbar con input
├─────────────────────────────┤
│  4 resultados               │  label con conteo
│                             │
│  ┌──────────────────────┐  │
│  │ 🎵 Color Humano      │  │  card resultado
│  │    Sui Generis  lacuerda│ │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🎵 Color Humano (ac.)│  │
│  │    Sui Generis cifraclub│ │
│  └──────────────────────┘  │
│  ...                        │
└─────────────────────────────┘
```

- Input con foco automático al abrir
- Badge del sitio origen (lacuerda / cifraclub) en --accent con fondo --accent-dim
- Tocar un resultado → navega a Pantalla 2 (previsualización)
- Estado de carga: spinner naranja + texto "Buscando en lacuerda y cifraclub..."
- Estado vacío: ícono + "Escribí el nombre de la canción o el artista"

**Pantalla 2 — Previsualización:**
```
┌─────────────────────────────┐
│  [←]  Color Humano          │  topbar con volver
│       Sui Generis · lacuerda│
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │  CARD BLANCO        │   │  letra completa
│  │  letra completa     │   │  mismo estilo que canción activa
│  │  scrolleable        │   │
│  └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│  ¿QUÉ HACEMOS CON ESTO?    │  label uppercase faint
│  [A la cola] [Guardar] [Ambas]│  3 botones
└─────────────────────────────┘
```

**Botones de acción:**
- "A la cola": fondo --accent, texto blanco (botón principal)
- "Guardar": fondo --bg-card, borde --border (secundario)
- "Ambas": fondo --bg-card, borde --border (secundario)
- Si la canción ya está en guardadas: "Guardar" y "Ambas" se deshabilitan
  y muestran "Ya guardada" en su lugar

**Navegación entre pantallas:** `transform: translateY` — la pantalla 2
entra desde la derecha sobre la pantalla 1.

---

## 7. TOPBAR

```
background: --bg-darker
border-bottom: 1px solid --border
padding: 12px 16px

Izquierda:
  label "SALA ACTIVA" (10px, uppercase, --text-faint, letter-spacing: 1.5px)
  nombre de sala (17px, weight 800, --text-primary)

Derecha:
  botón lupa circular (40px, fondo --accent, ícono blanco)
```

---

## 8. PANTALLA DE LOGIN

Minimalista. Misma paleta oscura.
- Fondo: --bg-app
- Logo / nombre de la app centrado
- Campo email + botón "Entrar" (magic link de Supabase Auth)
- Botón principal: fondo --accent, texto blanco, border-radius 10px
- Sin registro manual — solo magic link

---

## 9. PANTALLA DE LISTA DE SALAS

```
┌─────────────────────────────┐
│  CantemosTodosApp           │  topbar simple
├─────────────────────────────┤
│  SALAS DISPONIBLES          │  label
│                             │
│  ┌──────────────────────┐  │
│  │  Los del Viernes     │  │  card de sala
│  │  Guitarreada clásica │  │
│  │               [→]   │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  Juntada Verano      │  │
│  │  Rock nacional       │  │
│  └──────────────────────┘  │
└─────────────────────────────┘
```

Cards de sala: fondo --bg-card, borde --border, border-radius 12px.
Tocar una card → navega a la sala.

---

## 10. ANIMACIONES Y TRANSICIONES

Todas las transiciones usan la misma curva:
```css
transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
transition-duration: 350ms;
```

Aplicar a:
- Apertura/cierre del drawer de cola
- Navegación entre pantallas del buscador
- Overlay al abrir drawer
- Rotación de flecha en barra cola

Sin animaciones decorativas ni de entrada de página —
solo las transiciones funcionales mencionadas.

---

## 11. ÍCONOS

Usar **Lucide React** (ya disponible en el stack).
No usar emojis como íconos funcionales.

Mapa de íconos por función:
```
Buscar canción:    <Search />
Cerrar modal:      <X />
Volver:            <ArrowLeft />
Agregar (+):       <Plus />
Eliminar:          <Trash2 />
Guardar:           <Bookmark />
Drag handle:       6 puntos manuales (CSS grid 2x3 de dots)
Cola / siguiente:  <ChevronUp /> / <ChevronDown />
Canción:           <Music />
Ambas acciones:    <CopyPlus />
```

---

## 12. REGLAS DE ACCESIBILIDAD MÍNIMAS

- Todo botón sin texto visible debe tener `aria-label`
- Íconos decorativos: `aria-hidden="true"`
- El input del buscador recibe `autoFocus` al abrir el modal
- Touch targets mínimos: 44x44px para todos los botones
- Contraste letra/fondo: el card blanco con texto negro garantiza
  la máxima legibilidad en condiciones de poca luz

