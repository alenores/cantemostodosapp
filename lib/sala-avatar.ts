import { prepararFotoLiviana } from "@/lib/imagen-liviana";
import { createClient } from "@/lib/supabase/client";

export function validateSalaAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Elegí una foto.";
  }
  return null;
}

/** Sube la foto ya liviana y actualiza salas.avatar_url. */
export async function uploadSalaAvatar(
  salaId: number,
  file: File,
): Promise<string> {
  const validationError = validateSalaAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const liviana = await prepararFotoLiviana(file, "sala");
  const supabase = createClient();
  const path = `${salaId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("sala-avatars")
    .upload(path, liviana, { upsert: true, contentType: "image/webp" });

  if (uploadError) {
    if (uploadError.message.includes("Bucket not found")) {
      throw new Error("Todavía no se pueden guardar fotos de sala.");
    }
    throw new Error("No se pudo guardar la foto.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("sala-avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("salas")
    .update({ avatar_url: avatarUrl })
    .eq("id", salaId);

  if (updateError) {
    throw new Error("No se pudo guardar la foto.");
  }

  return avatarUrl;
}
