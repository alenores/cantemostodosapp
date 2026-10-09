const PERFIL = { maxLado: 384, pesoMax: 48 * 1024 };
const SALA = { maxLado: 960, pesoMax: 110 * 1024 };

type ImagenLista = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
};

async function abrirImagen(file: File): Promise<ImagenLista> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(bitmap, 0, 0, width, height);
        },
        close: () => bitmap.close(),
      };
    } catch {
      // Sigue con el otro camino.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
      const elemento = new Image();
      elemento.onload = () => resolve(elemento);
      elemento.onerror = () => reject(new Error("No se pudo usar esa foto."));
      elemento.src = url;
    });
    return {
      width: imagen.naturalWidth,
      height: imagen.naturalHeight,
      draw: (ctx, width, height) => {
        ctx.drawImage(imagen, 0, 0, width, height);
      },
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function aWebp(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", calidad);
  });
}

export async function prepararFotoLiviana(
  file: File,
  uso: "perfil" | "sala",
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí una foto.");
  }

  const limites = uso === "perfil" ? PERFIL : SALA;
  if (file.type === "image/webp" && file.size <= limites.pesoMax) {
    return file;
  }
  const imagen = await abrirImagen(file);

  try {
    if (imagen.width < 1 || imagen.height < 1) {
      throw new Error("No se pudo usar esa foto.");
    }

    let lado = limites.maxLado;
    let calidad = 0.72;
    let lista: Blob | null = null;

    for (let intento = 0; intento < 8; intento += 1) {
      const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
      const ancho = Math.max(1, Math.round(imagen.width * escala));
      const alto = Math.max(1, Math.round(imagen.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo preparar la foto.");
      }
      imagen.draw(ctx, ancho, alto);
      lista = await aWebp(canvas, calidad);

      if (lista?.type === "image/webp" && lista.size <= limites.pesoMax) {
        break;
      }

      if (calidad > 0.42) {
        calidad = Math.round((calidad - 0.12) * 100) / 100;
      } else {
        lado = Math.round(lado * 0.72);
        calidad = 0.6;
      }

      if (lado < 160) {
        break;
      }
    }

    if (!lista || lista.type !== "image/webp") {
      throw new Error("No se pudo preparar la foto.");
    }

    return new File([lista], "foto.webp", { type: "image/webp" });
  } finally {
    imagen.close();
  }
}
