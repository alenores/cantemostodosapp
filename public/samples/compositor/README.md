# Samples del Compositor

Archivos `.mp3` generados con `npm run fetch-compositor-samples`.

## Estructura y fuentes

| Carpeta | Archivos | Origen (Tonejs/audio) |
|---------|----------|------------------------|
| `piano/` | c2–c6 | Salamander grand piano |
| `guitar/` | pua, rasguido, dedo | Berklee — púa, acorde, cuerda La |
| `drums/` | kick, snare, hihat, hihat-open, crash, ride | Acoustic kit + Stark + hihat-short |
| `viento/` | c4, e4, a4, c5, e5, a5 | Flauta acústica ([tonejs-instruments](https://github.com/Makefully-Studios/tonejs-instruments), CC-BY 3.0) |

## Carga en la app

Los samples se agrupan en **packs** (`lib/compositor-sample-manifest.ts`):

- **core** — batería básica + piano central (carga rápida al abrir)
- **piano**, **guitarra**, **bateria**, **viento** — se descargan al reproducir capas activas o al editar una capa

No editar a mano; volver a ejecutar el script si hace falta actualizar.
