# Cantemos Todos — Descripción funcional del producto

> Documento orientado a negocio, nuevos integrantes del equipo y presentación comercial.  
> Describe **qué hace la aplicación** y **qué puede hacer una persona usuaria**, sin detalles técnicos de implementación.  
> Última revisión: julio 2026.

---

## 1. Resumen ejecutivo

**Cantemos Todos** es una aplicación web pensada principalmente para el **celular** que permite **cantar y tocar en grupo o solo**, con letras y acordes siempre a mano.

La herramienta reúne en un solo lugar:

- Un **cancionero** con canciones de la comunidad y favoritas personales.
- Un modo **Individual** para cantar solo con una fila de canciones personal.
- **Salas** para cantar en grupo en tiempo real, donde todos ven la misma canción al mismo tiempo.
- Herramientas de **práctica**: afinador, metrónomo, entrenador vocal, compositor de ritmos y entrenador de canciones con anotaciones privadas.
- Un **editor de canciones** para crear y editar letras con acordes y compases.
- Funcionamiento **parcial sin conexión** y posibilidad de **instalarla en el inicio del celular** como si fuera una app nativa.

La aplicación puede usarse **sin cuenta** (como invitado) con funciones limitadas, o **con cuenta** para desbloquear salas, favoritas, edición, sincronización y práctica personalizada.

---

## 2. Para quién es

Cantemos Todos está pensada para:

- **Grupos que cantan juntos**: reuniones entre amigos, coros informales, encuentros musicales en casa o en la iglesia.
- **Quien canta o toca solo**: ensayo personal, preparación antes de una juntada, práctica con letra en pantalla grande.
- **Quien quiere mejorar la voz o el ritmo**: con herramientas de afinación, metrónomo y entrenador vocal con micrófono.
- **Quien arma o adapta canciones**: editor de letras con acordes, compases y anotaciones de canto para practicar.

El diseño prioriza el **uso nocturno**, en reuniones, y en pantallas chicas (celular), aunque también funciona en computadora con una experiencia adaptada.

---

## 3. Problema que resuelve

Antes de una juntada musical, suele pasar lo siguiente:

- Cada persona busca la letra por su cuenta en distintos sitios.
- No hay una lista compartida de qué se va a cantar.
- Las letras no siempre tienen acordes, o los acordes no coinciden con la tonalidad del grupo.
- Ensayar solo (ritmo, afinación, respiración) requiere varias apps distintas.

Cantemos Todos concentra esas necesidades:

| Necesidad | Cómo la resuelve la app |
|-----------|-------------------------|
| Todos con la misma letra al mismo tiempo | Salas con canción activa sincronizada |
| Armar el repertorio de la juntada | Fila de canciones compartida en la sala |
| Cantar solo a tu ritmo | Modo Individual con fila personal |
| Tener canciones guardadas y ordenadas | Cancionero y Favoritas |
| Adaptar acordes y tonalidad | Editor y cambio de tono en lectura |
| Practicar antes de la juntada | Metrónomo, afinador, entrenador vocal, compositor |
| Marcar cómo cantar cada parte | Entrenador de canciones con anotaciones privadas |
| Usar sin internet en el lugar | Copia local de canciones ya sincronizadas |

---

## 4. Mapa general de la aplicación

La app se organiza en **cinco grandes áreas**, más la cuenta de usuario:

```
┌─────────────────────────────────────────────────────────────┐
│                      CANTEMOS TODOS                         │
├─────────────┬─────────────┬─────────────┬──────────┬────────┤
│  CANCIONES  │  INDIVIDUAL │    SALAS    │ PRÁCTICA │ CUENTA │
├─────────────┼─────────────┼─────────────┼──────────┼────────┤
│ Cancionero  │ Buscar      │ Crear sala  │ Metrónomo│ Login  │
│ Favoritas   │ Fila propia │ Unirse (QR) │ Entren.  │ Perfil │
│ Editor      │ Modo lectura│ Fila grupal │ Vocal    │        │
│             │             │ Tiempo real │ Compositor│       │
│             │             │             │ Entren.  │        │
│             │             │             │ canciones│        │
├─────────────┴─────────────┴─────────────┴──────────┴────────┤
│              AFINADOR (accesible desde varios puntos)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Inicio y navegación

### 5.1 Pantalla de inicio (celular)

Al abrir la app en el celular, la persona usuaria ve:

- Un saludo: **"Bienvenid@"**
- Su nombre, si inició sesión.
- La pregunta: **"¿Qué querés hacer?"**
- Cinco accesos principales en forma de tarjetas:

| Acceso | Qué dice | Qué permite |
|--------|----------|-------------|
| **Cancionero** | "Cancionero, favoritas y editor" | Ir al hub de canciones |
| **Individual** | "Cantar solo con Lista de canciones" | Modo personal de canto |
| **Salas** | "Cantar en grupo en tiempo real" | Salas compartidas (requiere internet) |
| **Práctica** | "Metrónomo, voz, compositor y entrenador" | Herramientas de ensayo |
| **Afinador** | "Afiná tu instrumento antes de empezar a tocar" | Se abre encima, sin salir del inicio |

Además, en el inicio pueden aparecer:

- Avisos de perfil (por ejemplo: "Perfil actualizado" o aviso de email pendiente de confirmación).
- Aviso de **sin conexión**: "Sin conexión · mostrando copia local cuando aplique".
- Guías para **instalar la app en el inicio del celular** (especialmente en iPhone).

### 5.2 Navegación en celular

En la parte inferior hay una **barra fija con cinco pestañas**:

1. **Individual**
2. **Salas** (si estás dentro de una sala, muestra el nombre de la sala y cuántas personas están conectadas)
3. **Inicio**
4. **Práctica**
5. **Cancionero**

La barra **desaparece** cuando entrás en **modo lectura** (letra a pantalla completa) y en las pantallas de login y registro.

### 5.3 Navegación en computadora

En computadora la experiencia es distinta:

- Hay un **menú lateral izquierdo** permanente con secciones desplegables:
  - **Canciones** → Cancionero, Favoritas, Editor de canciones
  - **Individual**
  - **Salas**
  - **Herramientas** → Afinador
  - **Práctica** → Metrónomo, Entrenador Vocal, Compositor, Entrenador de canciones
- Abajo del menú: acceso a **Mi perfil** o **Iniciar sesión**.
- Al abrir la app en computadora, el inicio con tarjetas **no se muestra**: la app va **directo a Individual**.
- Varias herramientas (afinador, editor, metrónomo, etc.) se abren como **ventanas superpuestas** en lugar de ocupar toda la pantalla.
- La fila de canciones aparece como **panel fijo al costado** de la letra, no como panel que sube desde abajo.

### 5.4 Hub de Canciones y Hub de Práctica

Tanto **Canciones** como **Práctica** tienen una pantalla intermedia (hub) que agrupa sus submódulos con botones **Ver** u **Abrir**:

**Canciones:**
- Cancionero
- Favoritas (requiere cuenta)
- Editor de canciones (requiere cuenta)

**Práctica:**
- Metrónomo
- Entrenador Vocal
- Compositor
- Entrenador de canciones (requiere cuenta)

---

## 6. Modo Individual

El modo **Individual** es la experiencia de **cantar solo**. Es la pantalla principal en computadora y una de las pestañas centrales en celular.

### 6.1 Pantalla principal

La persona usuaria ve:

- La **canción activa** (letra en pantalla).
- Un botón para **buscar canción**.
- Acceso a la **fila de canciones** (lista personal de qué va a cantar).

### 6.2 Fila de canciones (individual)

La fila es una **cola personal** que no se comparte con nadie. Cada canción puede estar en uno de estos estados:

| Estado | Significado |
|--------|-------------|
| **Activa** | La que se está cantando ahora |
| **Próxima** | La siguiente en la fila |
| **Pendiente** | En espera, más adelante en la fila |
| **Ya tocada** | Ya se cantó; puede volver a pendiente |

**Acciones disponibles:**

- **Agregar canción** (botón +)
- **Aleatorio**: activar o desactivar modo que suma canciones al azar del cancionero
- **Siguiente**: avanzar a la próxima canción de la fila
- **Borrar toda la lista**: con doble confirmación para evitar borrados accidentales
- **Reordenar** arrastrando canciones
- En celular: al arrastrar fuera de la lista, aparece una zona para **eliminar** una canción

Si la fila está vacía, se muestra: *"La fila está vacía · Agregá una canción con el +"*.

Al sumar una canción aparece el aviso: **"Canción sumada a la lista"**.

**Con cuenta:** la fila se **guarda** entre sesiones.  
**Sin cuenta (invitado):** la fila se **pierde** al recargar o cerrar la app.

### 6.3 Funcionamiento sin conexión

Individual funciona **sin internet** usando la copia local de canciones que ya se sincronizaron cuando hubo conexión.

---

## 7. Búsqueda de canciones

El buscador se abre desde Individual, Salas o el modo lectura.

### 7.1 Pestañas y filtros

- En Individual hay dos pestañas: **General** y **Favoritas**.
- La pestaña Favoritas solo está disponible **con cuenta iniciada**.

### 7.2 Cómo buscar

- Campo de búsqueda: *"Buscar canción…"* o *"Filtrar favoritas…"*.
- Estado inicial: *"Escribí el nombre de la canción o el artista"*.

Los resultados se agrupan en:

1. **Del cancionero** (o **Favoritas** si estás en esa pestaña): canciones guardadas en la app. Las que tienen cifrado avanzado (acordes y compases) se distinguen visualmente.
2. **En internet**: links guardados previamente y resultados de sitios web de acordes y letras (por ejemplo Cifra Club, sitios de acordes).

Si no hay resultados: *"No encontramos resultados…"* o *"No tenés canciones guardadas en Favoritas"*.

### 7.3 Previsualización

Antes de confirmar una canción, se puede **previsualizar**:

- Se muestra título, artista y sitio de origen.
- La letra puede verse embebida (dentro de la app) o como texto local.
- En sitios de acordes externos, la primera vez aparece una ayuda; se puede revelar la página completa.
- Si aplica, hay opciones para **guardar letra completa**, **guardar link** o **guardar canción** al cancionero.

### 7.4 Confirmación de canción

Al pie de la previsualización: **"¿Confirmás la canción?"**

| Acción | Qué hace |
|--------|----------|
| **Sumar a la lista** | Agrega la canción a la fila (individual o de la sala) |
| **Ver ahora** | Pone la canción como activa. En sala, si ya hay una activa, pide confirmación |
| **Guardar** | Guarda al cancionero. Puede preguntar si querés sumarla a Favoritas |

**Restricción:** en Individual, "Sumar a la lista" puede estar deshabilitado si no hay canción activa ni pendientes en la fila.

### 7.5 Permisos según tipo de usuario

| Acción | Invitado | Con cuenta |
|--------|----------|------------|
| Ver ahora | Sí | Sí |
| Sumar a la lista | Sí* | Sí* |
| Guardar en cancionero | No | Sí |
| Pestaña Favoritas en buscador | No | Sí |
| Ofrecer sumar a Favoritas tras guardar | — | Sí |

\* Solo si hay canción activa o pendientes en la fila.

---

## 8. Cancionero

### 8.1 Listado del cancionero global

- Título: **Cancionero**.
- Búsqueda: *"Buscar por nombre o artista…"*.
- Botón **+** para **Agregar canción** (requiere cuenta y conexión).

**Mensajes según situación:**

| Situación | Mensaje |
|-----------|---------|
| Sin conexión | *"Sin conexión · mostrando copia local (solo lectura)"* |
| Vacío con cuenta y conexión | *"Aún no hay canciones. Tocá + para agregar la primera."* |
| Vacío sin conexión previa | *"No hay copia local todavía. Conectate a internet para sincronizar."* |

### 8.2 Acciones por canción

| Acción | Quién puede |
|--------|-------------|
| **Ver** | Todos |
| **Guardar en Favoritas** | Usuarios con cuenta (requiere conexión) |
| **Editar** | Solo el autor de la canción |
| **Eliminar** | Solo el autor de la canción (con confirmación) |

**Cómo se accede a las acciones:**
- En celular: mantener pulsado o menú contextual.
- En computadora: iconos visibles en cada tarjeta de canción.

### 8.3 Vista de canción

Al ver una canción:

- Se muestra la letra, con o sin acordes y compases según cómo fue guardada.
- Navegación **Anterior / Siguiente** entre canciones del listado filtrado.
- Botón **Expandir** para entrar al **modo lectura**.

---

## 9. Favoritas

Las **Favoritas** son el cancionero personal de cada usuario con cuenta.

- Lista de canciones guardadas (del cancionero global o links/letras propios).
- Búsqueda por nombre o artista.
- Acciones: **Ver**, **Agregar a la fila** (en Individual), **Eliminar** de favoritas.
- **Requiere cuenta** y conexión para sincronizar cambios.

---

## 10. Editor de canciones

El editor permite **crear canciones nuevas** o **editar las propias**. Requiere **cuenta iniciada** y **conexión** para guardar.

### 10.1 Presentación según dispositivo

- **Celular:** pantalla completa dedicada al editor.
- **Computadora:** ventana superpuesta sobre el listado o el hub.

### 10.2 Tres modos de edición

| Modo | Para qué sirve |
|------|----------------|
| **Acordes** | Tocar la letra para colocar acordes; arrastrarlos; tocar un acorde para editarlo o borrarlo |
| **Compás** | Marcar inicio de compases; definir patrón de intensidad o usar un ciclo del Compositor |
| **Letra** | Editar el texto línea por línea sin mover acordes ni compases |

### 10.3 Herramienta de compás

- **Componer:** definir golpes e **intensidad** por golpe (silencio, suave, medio, fuerte).
- **Ciclo guardado** del Compositor para batería; si no hay ciclo, suena un click.
- **Aplicar ciclos:** elegir cantidad por renglón o **Aplicar a todos los renglones** (con aviso si ya hay compases marcados).

### 10.4 Acciones por renglón

- **Lápiz:** eliminar renglón, insertar abajo, copiar acordes/compás, unir renglones (con vista previa).
- **Candado:** bloquear el renglón contra edición accidental.
- Confirmaciones al borrar letra, acordes o compases de un renglón.

### 10.5 Datos de la canción y guardado

- **Nombre** (obligatorio), **artista**, **tonalidad**, **modo tonal**, **velocidad (BPM)**.
- Botón **Guardar**.
- **Reproducir compás** para revisar el ritmo sobre la letra antes de guardar.

---

## 11. Salas (cantar en grupo)

Las salas permiten que varias personas **canten juntas en tiempo real**, viendo la misma canción activa y compartiendo una fila de canciones.

**Requiere cuenta e internet** en todo momento para funcionar correctamente.

### 11.1 Listado de salas

- Título: **Salas**.
- Subtítulo: *"Entrá a tocar con tu gente"*.
- Botón **Crear sala** (+); deshabilitado sin conexión.

**Mensajes:**

| Situación | Mensaje |
|-----------|---------|
| Sin conexión | *"Sin conexión · las salas necesitan internet. Usá Individual para tocar solo."* |
| Sin salas | *"Todavía no tenés salas"* + *"Creá la primera o pedí que te inviten con el QR desde dentro de una sala."* |

Cada tarjeta de sala permite entrar y ver sus **participantes**.

### 11.2 Crear una sala

Ventana **Nueva sala / Crear sala** con:

- Foto opcional (JPG, PNG o WebP; máximo 2 MB).
- **Nombre** (ejemplo: "Los del viernes"; máximo 80 caracteres).
- **Descripción** opcional (máximo 200 caracteres).
- Botón **Crear sala**.

### 11.3 Dentro de una sala

Todos los participantes conectados comparten:

- La **misma canción activa** (sincronizada en tiempo real).
- La **misma fila de canciones** (cola de la juntada).
- Una **barra de presencia** con avatares, contador (*"X en la sala"*), indicador **"en vivo"** y botón **QR** para invitar.

**Controles de la fila** (iguales a Individual, más sincronización grupal):

- Agregar canción, aleatorio, siguiente, borrar toda la lista, reordenar.
- En cada canción de la fila se puede ver **quién la agregó** (avatar o nombre).
- Arrastrar para reordenar pendientes o eliminar (zona de eliminar al soltar fuera, en celular).

**Si se pierde la conexión estando adentro:**

- Mensaje: *"Podés seguir leyendo la canción. Salí de la sala cuando termines."*
- Se ocultan buscador y presencia en vivo.
- Aparece botón **Salir**.

**Si se intenta entrar sin conexión:**

- *"Las salas necesitan internet. Volvé cuando tengas señal."*

### 11.4 Invitación y código QR

Desde dentro de la sala, el botón **QR** abre la ventana de **Invitación**:

- Código QR escaneable.
- Texto: *"Escaneá este código para sumarte a la sala"*.
- Dirección web visible para compartir manualmente.

**El creador de la sala puede:**

- **Generar código nuevo** (invalida el anterior).
- **Sumar por email** (campo `amigo@email.com`, botón **Sumar**).
- Ver lista de **Miembros** y eliminar participantes (excepto a sí mismo como creador).

**Flujo de quien recibe la invitación:**

1. Escanea el QR o abre el link.
2. Si no tiene sesión, se le pide iniciar sesión y luego entra a la sala.
3. Si el código es inválido, ve un aviso de que no tiene acceso.

### 11.5 Sincronización en tiempo real

| Qué se sincroniza | Comportamiento |
|-------------------|----------------|
| Canción activa | Cambia para todos cuando alguien pone **Ver ahora** o avanza **Siguiente** |
| Fila de canciones | Agregar, reordenar, eliminar y finalizar se reflejan en todos los dispositivos |
| Modo lectura — auto-scroll | La posición de lectura se comparte entre participantes que ven la misma canción |
| Presencia | Quién está conectado se actualiza en vivo |

### 11.6 Roles en salas

| Rol | Quién es | Qué puede hacer |
|-----|----------|-----------------|
| **Creador** | Quien creó la sala | Cambiar foto, invitar por email, eliminar miembros, rotar QR, gestionar participantes |
| **Miembro** | Invitado a la sala | Cantar, usar la fila, invitar (según pantalla de QR), salir de la sala |

**Restricciones del creador:**

- No puede eliminarse a sí mismo como creador.
- Para invitar con QR desde el listado de participantes, debe entrar primero a la sala (*"Sos el creador. Para invitar con QR, entrá a la sala."*).

**Salir de la sala (miembro):**

- Confirmación: *"¿Salir de [nombre]? Ya no vas a verla hasta que te vuelvan a invitar."*
- Opciones: **Cancelar** / **Sí, salir**.

---

## 12. Modo lectura

El **modo lectura** es la pantalla inmersiva para cantar: letra grande, mínimos controles, máxima legibilidad.

### 12.1 Cómo se entra y sale

- Se entra con **Expandir** desde la vista de una canción (cancionero, individual, sala o entrenador de canciones).
- Se sale con **Contraer**.

### 12.2 Controles en celular (menú flotante)

- **Contraer** (salir del modo lectura)
- **Buscar**, **Siguiente**, **Fila · N** (cantidad de pendientes) — en individual y sala
- **Anterior**, **Siguiente** — en cancionero (solo celular)
- **Activar compases** (si estaban ocultos)
- **Mostrar / Ocultar acordes**
- **Cambiar de tono** (si la canción tiene tonalidad definida)
- **Tamaño de letra** (zoom)
- **Afinador**
- **Tema visual**: cicla entre **Claro → Sepia → Escenario**
- En entrenador de canciones: mostrar/ocultar tipos de anotación, **Nota de la canción**, **Editar**

### 12.3 Controles inferiores y en computadora

- **Auto-scroll** con niveles de velocidad (acelerar / desacelerar).
- Si la canción tiene compases: **Reproducir / Pausar compás**, control de **velocidad (BPM)**, mostrar/ocultar compases.
- En computadora: zoom de letra en la barra inferior; barra superior con **Contraer** y accesos directos (menos menú flotante que en celular).

### 12.4 Sincronización en sala

En modo lectura dentro de una sala conectada, el auto-scroll puede **seguir al líder** de la lectura compartida: todos ven la letra moverse al mismo ritmo.

### 12.5 Temas de lectura

| Tema | Descripción |
|------|-------------|
| **Claro (Día)** | Fondo claro, ideal con luz |
| **Sepia** | Tono cálido, menos cansancio visual |
| **Escenario** | Fondo oscuro, ideal con poca luz |

---

## 13. Herramientas de práctica

### 13.1 Afinador

- Detecta la nota que se está tocando o cantando usando el **micrófono**.
- Muestra la **nota grande**, la **frecuencia** y una escala: **Más bajo — En nota — Más alto**.
- Indicador visual cuando está **afinado** (zona central resaltada).
- Pide permiso de micrófono la primera vez.
- Accesible desde: inicio (celular), menú de herramientas, hubs de Canciones y Práctica, y modo lectura.
- **No requiere cuenta.**

### 13.2 Metrónomo

Herramienta para practicar **tiempos y ritmo**. El módulo está considerado **cerrado y estable** (no se suman instrumentos ni sonidos adicionales).

**Configuración:**

- Resumen: *"Ciclo de N golpes · [figuras] · X BPM"* (velocidad entre 40 y 240).
- **Tempo** (BPM), **Ciclo** (1 a 10 golpes), **Figura** por golpe (redonda, blanca, negra, corchea, semicorchea), **Intensidad** por golpe (silencio, suave, medio, fuerte).
- **Play / Stop**.
- **Pulsa**: marcar tempo manualmente (tap tempo).

**Modo con micrófono:**

- Detecta si los golpes coinciden con el metrónomo (precisión en una línea de tiempo).

**Presentación:**

- En celular: puede abrirse como ventana desde el hub o como pantalla dedicada.
- En computadora: layout adaptado con panel lateral.

- **No requiere cuenta.**

### 13.3 Entrenador Vocal

Herramienta de **práctica de voz con micrófono**, separada del Compositor:

> *"El Entrenador Vocal es para practicar y evaluar; el Compositor es para armar y experimentar."*

**Permiso de micrófono:**

- Mensajes: **"Acceso al micrófono"**, **Permitir micrófono**, **Reintentar**, **"Solicitando permiso…"**, **"Conectando micrófono…"**.

**Ocho modos de práctica** (deslizable en celular; en computadora agrupados en **Tono** y **Ritmo + voz**):

**Escala de tono (de más simple a más complejo):**

| # | Modo | Qué practica |
|---|------|--------------|
| 1 | **Encajar** | Afinarse a una nota objetivo |
| 2 | **Sostener** | Mantener la nota en el tiempo |
| 3 | **Octavas** | La misma nota en distintas octavas |
| 4 | **Melodía** | Seguir un patrón de varias notas por ciclo |

**Escala de ritmo + voz:**

| # | Modo | Qué practica |
|---|------|--------------|
| 5 | **Ritmo** | Cantar o callar según patrón rítmico (sin evaluar tono) |
| 6 | **Ritmo-Intensidad** | Ritmo + variación de volumen por golpe |
| 7 | **Ritmo-Nota** | Ritmo + una nota distinta por golpe |
| 8 | **Combo** | Ritmo + notas + evaluación de tono e intensidad |

**Controles comunes:**

- Elegir **nota objetivo**, **tempo (BPM)**, **ciclo** (cantidad de golpes), **figura**, **intensidad** por golpe.
- En melodía y combo: **nota** por golpe.
- **Pulsa** para marcar tempo manualmente.
- Botón **Practicar** / reproducir; micrófono activable para evaluación.
- Gráficos de seguimiento en tiempo real, historial de intentos, celebraciones al acertar.
- En modos Encajar y Sostener: calibre de tolerancia y segundos a sostener.

- **No requiere cuenta.**

### 13.4 Compositor

Herramienta para **armar y experimentar** con ritmos y melodías propias. Los ciclos guardados se pueden reutilizar en el editor de canciones (compases) y en el entrenador vocal.

#### Biblioteca — Mis ciclos

- Título: **Mis ciclos**.
- Descripción: *"Tu biblioteca de patrones. Abrí uno para editarlo o creá uno nuevo."*
- Acciones: **Nuevo ciclo**, **Importar MIDI**, actualizar lista.
- Por cada ciclo: **Abrir**, **Editar**, **Escuchar**, **Eliminar**, **Guardar ciclo**, **Guardar cambios**, **Guardar como…**, **Descartar cambios**.

#### Comunidad

- Pestaña **Comunidad**: *"Ciclos que otros usuarios compartieron…"*
- Sin sesión: *"Iniciá sesión con conexión para explorar…"*
- Sin internet: *"Conectate a internet para ver los ciclos…"*
- Por ciclo ajeno: **Agregar a mis ciclos**.
- En ciclos propios: **Compartir con la comunidad** / **Compartido con la comunidad**.

#### Editor de ciclo

**Estructura:**

- **Ciclo compartido:** golpes y figura comunes a todas las capas.
- **Capas (instrumentos):** Batería, Guitarra, Piano, Viento (cada una activable).
- Hasta **24 bloques por capa**.

**Por cada bloque se configura:**

- Posición en el ciclo.
- Sustento (duración).
- Nota (en capas melódicas).
- Intensidad (silencio, suave, medio, fuerte).
- Timbre:
  - **Guitarra:** púa, rasguido ↓, rasguido ↑, dedo, bloque, silencio.
  - **Batería:** bombo, caja, hi-hat, hi-hat abierto, platillo crash, platillo ride, silencio.

**Pestañas del editor:** Ciclo, Tempo, Batería, Tonalidad, Melodías, Escuchar.

**Plantillas disponibles:**

- Ritmos de batería.
- Melodías.
- Acompañamiento (guitarra: punteo/rasguido para cantar encima).

- Vista previa de **tres ciclos** antes de aplicar una plantilla.
- Confirmación al reemplazar contenido existente.
- **Tonalidad** de composición como referencia para transponer al usar el ciclo en una canción.
- Escuchar una capa individual o el ciclo completo.

#### Importación MIDI

- Elegir archivo `.mid` o `.midi`.
- Se procesa en el dispositivo; el archivo original no se guarda.
- Paso **Recorte:** elegir capas, tramo de la canción, escuchar selección; límite de golpes por ciclo.
- Paso **Revisión:** resolver conflictos bloque a bloque.
- **Guardar ciclo**; puede generar varios ciclos del mismo archivo.
- **Cancelar importación** pierde el progreso.

#### Permisos

| Función | Invitado | Con cuenta |
|---------|----------|------------|
| Crear y guardar ciclos localmente | Sí | Sí (+ sincronización en la nube) |
| Comunidad (explorar y agregar ciclos ajenos) | No | Sí (con internet) |

### 13.5 Entrenador de canciones

Copias **privadas** de canciones solo para practicar. **No se publican** en el cancionero global.

**Requiere cuenta.** Sin cuenta, redirige al inicio.

#### Listado

- Título: **Entrenador de canciones**.
- Búsqueda: *"Buscar en mi práctica"*.
- Botones: **Cancionero** (traer copia desde el cancionero global) y **+** (crear nueva).
- Vacío: *"Todavía no tenés canciones de práctica"* + *"Traé una del Cancionero o creá una nueva. Quedan solo para vos; no se publican en el Cancionero Global."*

#### Origen de las canciones de práctica

1. **Desde el Cancionero:** elegir una canción existente; se clona letra, acordes, compases y anotaciones a una copia privada.
2. **Nueva:** editor vacío con la misma herramienta que el editor de canciones, guardado en práctica.

#### Editor de práctica

- Mismos modos **Acordes / Compás / Letra** que el editor de canciones.
- Modo **Canto** para agregar anotaciones (ver tabla abajo).
- **Nota de la canción** (botón flotante): nota general libre, separada de las anotaciones en la letra.

#### Tipos de anotaciones de canto

| Tipo | Etiqueta en la app | Qué hace |
|------|-------------------|----------|
| **Nota** | Anotaciones | Punto en la letra con texto libre; icono **!** debajo del renglón |
| **Intensidad** | Intensidad | Marca arriba de la letra: Mucho más fuerte, Más fuerte, Más suave, Mucho más suave |
| **Texto** | Texto | Texto corto debajo del renglón (máximo 20 caracteres) |
| **Respirar** | Respirar | Marca de respiración arriba de la letra; se coloca directo |
| **Exigencia** | Exigencia | Rango en la letra (dos toques: inicio y fin); color Amarillo, Naranja o Rojo; resalta el fondo del tramo |

Para **Exigencia:** el primer toque marca el inicio del rango; el segundo marca el fin (en el mismo renglón).

#### Vista de práctica (Ver)

- Modo lectura permanente con cifrado, compases y anotaciones.
- Mostrar/ocultar por tipo: Anotaciones, Intensidad, Texto, Respirar, Exigencia.
- Acceso a **Nota de la canción**, **Editar**, cambio de tono, zoom y afinador.

---

## 14. Cuenta de usuario

### 14.1 Registro

- Campos: **Nombre**, **Email**, **Contraseña**.
- Botón **Registrarse**.
- Enlace: *"¿Ya tenés cuenta? Iniciá sesión"*.
- Requiere **conexión a internet**.
- Tras registrarse, va al inicio.

### 14.2 Iniciar sesión

- Campos: **Email** y **Contraseña**.
- Botón **Entrar** (o **"Entrar (requiere WiFi)"** sin conexión).
- Error: *"Email o contraseña incorrectos"*.
- Enlace: *"¿No tenés cuenta? Registrate"* (solo con conexión).
- Tras login exitoso, vuelve a la pantalla que intentaba abrir o al inicio.

**Sin internet:**

- Aviso: *"Sin conexión · podés continuar en Home con la copia local del celular"*.
- Campos deshabilitados.
- Botón **Continuar sin conexión** → entra como invitado con datos locales.

### 14.3 Perfil (Mi perfil)

Solo disponible **con cuenta iniciada**.

- **Foto de perfil:** elegir imagen (JPG, PNG o WebP; máximo 2 MB); vista previa circular.
- **Nombre** (obligatorio).
- **Email** (obligatorio); si se cambia, llega confirmación por correo y se sigue entrando con el email actual hasta confirmar.
- **Cambiar contraseña:** contraseña actual, nueva (mínimo 6 caracteres), confirmación.
- Botón **Guardar cambios**.
- **Cerrar sesión** (limpia datos locales de sesión y va al login).

### 14.4 Modo invitado (sin cuenta)

- Nombre mostrado: **"Invitado"**.
- Puede: usar copia local del cancionero, Individual offline, afinador, metrónomo, entrenador vocal, compositor local.
- No puede: Favoritas, editor, entrenador de canciones, salas, guardar canciones, comunidad del compositor.

---

## 15. Uso sin conexión e instalación en el celular

### 15.1 Requisito inicial

La primera vez se necesita **conexión a internet** para descargar la app y sincronizar el cancionero. Después, muchas funciones siguen disponibles sin red.

Si se abre sin conexión y nunca se cacheó nada:

- Pantalla **"Sin conexión"** con explicación.
- Botón **Volver al inicio**.

### 15.2 Qué funciona sin internet

| Área | Qué se puede hacer |
|------|-------------------|
| Inicio / Individual | Buscar en copia local, ver letras, modo lectura |
| Cancionero global | Ver copia local (solo lectura; no editar ni guardar) |
| Práctica | Metrónomo, afinador, entrenador vocal, compositor con ciclos guardados en el dispositivo |
| Login | Continuar sin conexión como invitado |

### 15.3 Qué NO funciona sin internet

| Área | Limitación |
|------|------------|
| Salas | Listado, entrar, tiempo real, presencia, QR |
| Login y registro | Requieren conexión |
| Guardar, editar, sincronizar canciones | Bloqueado |
| Favoritas (escritura) | Bloqueado |
| Entrenador de canciones | Datos en la nube |
| Comunidad del Compositor | Requiere conexión |
| Búsqueda en internet de letras nuevas | No disponible |
| Sincronización de fila en sala | No disponible |

### 15.4 Instalación en el celular (app instalable)

La app se puede **agregar al inicio del celular** como si fuera una aplicación independiente:

- Banner **"Instalá la app"** con pasos para iPhone (Safari: compartir → agregar a inicio) y Android.
- Mensaje: usar siempre el **ícono de inicio** de Cantemos Todos, no el navegador.
- Ayuda si se abrió desde un link externo: buscar el ícono en la pantalla de inicio.

---

## 16. Comparativa: celular vs computadora

| Área | Celular | Computadora |
|------|---------|-------------|
| Inicio | Hub con 5 tarjetas + guías de instalación | Redirige a Individual; menú lateral |
| Menú principal | Barra inferior (5 pestañas) | Barra lateral izquierda |
| Editor de canciones | Pantalla completa | Ventana superpuesta |
| Herramientas (afinador, metrónomo, voz, compositor) | Ventana o pantalla según entrada | Ventana superpuesta desde el hub; pantallas dedicadas en Práctica |
| Modo lectura | Menú flotante + chips superiores | Barra superior con Contraer; zoom en barra inferior |
| Navegación en lectura (cancionero) | Anterior / Siguiente en menú flotante | En la vista principal o modal |
| Acciones en tarjetas de canción | Mantener pulsado / menú contextual | Iconos visibles en la tarjeta |
| Fila de canciones | Panel que sube desde abajo | Panel fijo al costado de la letra |
| Salas en menú lateral | — | Muestra nombre de sala y conectados; deshabilitado sin internet |
| Encabezado superior naranja | Visible en varias secciones | Oculto; la info va en el menú lateral |

---

## 17. Comparativa: invitado vs cuenta registrada

| Función | Invitado | Con cuenta |
|---------|----------|------------|
| Individual: buscar, ver, fila | Sí (fila efímera) | Sí (fila guardada) |
| Guardar en cancionero | No | Sí |
| Favoritas | No | Sí |
| Editor de canciones | No | Sí |
| Salas | No | Sí |
| Entrenador de canciones | No | Sí |
| Afinador | Sí | Sí |
| Metrónomo | Sí | Sí |
| Entrenador Vocal | Sí | Sí |
| Compositor (ciclos locales) | Sí | Sí (+ sincronización en la nube) |
| Compositor (comunidad) | No | Sí (con internet) |
| Perfil | No | Sí |
| Uso offline parcial | Sí | Sí (+ más datos si ya sincronizó) |

---

## 18. Roles y permisos

### 18.1 A nivel de la aplicación

No existe un rol de **administrador global**. Todos los usuarios tienen las mismas capacidades generales, con dos excepciones:

1. **Canciones del cancionero:** solo el **autor** puede editarlas o eliminarlas del cancionero global. Cualquier usuario con cuenta puede guardarlas en Favoritas.
2. **Salas:** existen roles de **creador** y **miembro** (detallados en la sección 11.6).

### 18.2 Permisos sobre canciones

| Acción | Invitado | Autor (con cuenta) | Otro usuario (con cuenta) |
|--------|----------|-------------------|--------------------------|
| Ver / leer | Sí (local si offline) | Sí | Sí |
| Agregar canción nueva | No | Sí | Sí |
| Editar | No | Solo las propias | Solo las propias |
| Eliminar del cancionero global | No | Solo las propias | No |
| Guardar en Favoritas | No | Sí | Sí |

---

## 19. Flujos de uso más importantes

### 19.1 De la búsqueda a cantar

```
Buscar canción → Previsualizar → Ver ahora o Sumar a la lista → (opcional) Modo lectura
```

### 19.2 De cancionero a favoritas

```
Ver canción → Guardar en Favoritas
```
o
```
Buscador → Guardar → ¿Querés sumarla a Favoritas? → Sí
```

### 19.3 De cancionero a práctica personal

```
Entrenador de canciones → Cancionero → Elegir canción → Copia privada con anotaciones
```

### 19.4 De compositor a canción

```
Compositor → Guardar ciclo → Editor de canciones → Compás → Usar ciclo guardado
```

### 19.5 De invitación a sala grupal

```
Escanear QR → (login si hace falta) → Entrar a sala → Misma fila y canción para todos
```

---

## 20. Estado del producto: terminado vs en evolución

### 20.1 Totalmente construido y usable

- Inicio, navegación móvil y de computadora.
- Individual con fila, buscador y modo lectura.
- Cancionero global, Favoritas y Editor de canciones.
- Salas con tiempo real (fila, presencia, scroll sincronizado, QR, invitación por email).
- Afinador.
- Metrónomo (módulo cerrado y estable).
- Entrenador Vocal (8 modos de práctica).
- Compositor (capas, ciclos, comunidad, importación MIDI).
- Entrenador de canciones con anotaciones de canto.
- Login, registro y perfil.
- Modo offline parcial e instalación en el celular.

### 20.2 En evolución o integración pendiente

| Tema | Estado |
|------|--------|
| Reproducción melódica completa al leer canciones en el cancionero (transposición automática a la tonalidad del usuario) | Parcial / en evolución |
| Conexión profunda entre ciclos del Compositor y el Entrenador Vocal | Pendiente |
| Arrastrar bloques libremente en la línea de tiempo del Compositor | Pendiente |

> Nota: el Compositor ya no está "en camino"; es una herramienta operativa. Los textos antiguos de "próximamente" ya no aplican a ese módulo.

---

## 21. Glosario

| Término | Significado en la app |
|---------|----------------------|
| **Modo lectura** | Pantalla a pantalla completa dedicada a leer/cantar la letra |
| **Modo control** | Pantalla normal de la app con menús, botones y navegación visibles |
| **Fila de canciones** | Lista ordenada de canciones para cantar (personal en Individual, compartida en Salas) |
| **Canción activa** | La canción que se está cantando en este momento |
| **Cifrado avanzado** | Canción con acordes sobre la letra y, opcionalmente, compases marcados |
| **Ciclo** | Patrón rítmico o melódico que se repite (en el Compositor) |
| **Capa** | Una línea de instrumento dentro de un ciclo: batería, guitarra, piano o viento |
| **Compás** | Marca de ritmo sobre la letra de una canción |
| **Tonalidad** | La escala o "tono" en que está escrita o se muestra una canción |
| **Invitado** | Usuario que usa la app sin crear cuenta |
| **Sala** | Espacio virtual donde un grupo canta junto en tiempo real |
| **Creador (de sala)** | Quien creó la sala; tiene permisos de gestión |
| **Presencia** | Indicador en vivo de quién está conectado a una sala |
| **Copia local** | Versión de las canciones guardada en el dispositivo para uso sin internet |

---

## 22. Nota para el equipo (mantenimiento de este documento)

Este archivo es la **descripción funcional oficial** del producto. Debe actualizarse cada vez que se agregue, modifique o elimine una funcionalidad visible para el usuario.

**Cuándo actualizar:**

| Cambio en el producto | Sección a revisar |
|-----------------------|-------------------|
| Nueva pantalla o módulo | Agregar sección nueva o ampliar el mapa (sección 4) |
| Cambio de flujo (salas, login, búsqueda, etc.) | Sección del módulo afectado |
| Nueva restricción (cuenta, offline) | Secciones 17 y 15 |
| Diferencia nueva entre celular y PC | Sección 16 |
| Funcionalidad que pasa de "en evolución" a "terminada" | Sección 20 |
| Nuevo rol o permiso | Sección 18 |

**Regla:** si el cambio es visible para el usuario, el documento se actualiza en la **misma entrega** del cambio.

---

*Documento generado para presentación comercial y orientación del equipo. Para detalles técnicos de implementación, consultar la documentación de desarrollo del proyecto.*
