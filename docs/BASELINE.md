# Baseline estable — cancionero auto-scroll

Punto de referencia antes de sumar auto-scroll en la **sala** (canción activa + `ColaBottomSheet`).

## Git

| Campo | Valor |
|-------|--------|
| **Tag** | `baseline-cancionero-autoscroll-ok` |
| **Commit** | `b621a96` |
| **Rama** | `main` (al 2026-06-21) |
| **Mensaje** | Fix manual letter scroll during auto-scroll using native pan-y. |

### Volver a este punto

```bash
git fetch origin
git checkout baseline-cancionero-autoscroll-ok
```

Rama de trabajo desde el baseline:

```bash
git checkout -b fix/desde-baseline baseline-cancionero-autoscroll-ok
```

Solo inspeccionar (detached HEAD):

```bash
git switch --detach baseline-cancionero-autoscroll-ok
```

## Qué funciona en este baseline

Pantalla **Canciones guardadas** → modal de detalle:

- Carrusel horizontal (← →) para cambiar de canción
- Letra a ancho completo, pegada al encabezado
- Barra inferior con flechas ↑ (desacelerar / parar) y ↓ (acelerar / iniciar)
- Velocidades 1–5; nivel 0 = parado
- Auto-scroll: el dedo manda mientras tocás la letra; al soltar, retoma
- Única forma de parar: bajar velocidad a 0 con ↑
- El listado de atrás no scrollea con el modal abierto (portal + bloqueo de scroll)

## Archivos principales

- `components/cancionero/CancioneroVerModal.tsx`
- `components/cancionero/CancioneroPageClient.tsx`
- `components/salas/LetraTexto.tsx` (prop `edgeToEdge`)

## Fuera de alcance (aún no implementado)

- Auto-scroll en sala / `CancionActivaSection`
- Letras embebidas (iframe / Cifra Club) en sala
- Cualquier cambio en `components/salas/ColaBottomSheet.tsx`

## Checklist de verificación (~5 min)

1. Abrir una canción guardada → nombre, artista y letra visibles
2. Deslizar horizontal en el encabezado → cambia de canción con animación
3. Tocar ↓ → empieza auto-scroll lento; más ↓ → sube velocidad (1–5)
4. Con auto-scroll activo: tocar la letra y deslizar arriba/abajo → se mueve; al soltar → sigue solo
5. Tocar ↑ hasta velocidad 0 → se detiene
6. Con el modal abierto, el listado de canciones de atrás no se mueve

## Próximo trabajo (riesgo medio)

Integrar auto-scroll en la canción activa de la sala reutilizando la lógica del modal, **sin modificar** `ColaBottomSheet`.

> Actualizado: auto-scroll en sala implementado en `CancionActivaSection` + `hooks/useLetraAutoScroll.ts` (solo letra texto). Tag anterior sigue siendo el rollback del cancionero.
