# Samples del Compositor

Archivos `.mp3` generados con `npm run fetch-compositor-samples`.

## Estructura y fuentes

| Carpeta | Archivos | Origen |
|---------|----------|--------|
| `piano/` | C / D# / F# / A de C2 a C6 (17 notas) | Salamander grand piano (Tonejs/audio, CC-BY 3.0) |
| `guitar/` | cuerdas al aire E2–E4 | Berklee (Tonejs/audio); púa/dedo/bloque/rasguido se diferencian por ataque y color |
| `drums/` | kick, snare, hihat, hihat-open, crash, ride | Acoustic kit + Stark + hihat-short |
| `viento/` | C/E/A en octavas 4–6 | Flauta acústica ([tonejs-instruments](https://github.com/Makefully-Studios/tonejs-instruments), CC-BY 3.0) |

## Carga en la app

Los samples se agrupan en **packs** (`lib/compositor-sample-manifest.ts`):

- **core** — batería básica + piano central (carga rápida al abrir)
- **piano**, **guitarra**, **bateria**, **viento** — se descargan al reproducir capas activas o al editar una capa

## Sustento

El ancho máximo de cada bloque sigue la duración útil del sample
(`lib/compositor-sample-sustain.ts`): piano ~8 s, viento ~7 s,
guitarra según articulación (púa más corta, dedo/rasguido más largos),
batería 1 paso.

No editar a mano; volver a ejecutar el script si hace falta actualizar.
