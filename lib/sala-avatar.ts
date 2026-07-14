import { createClient } from "@/lib/supabase/client";

const MAX_SALA_AVATAR_BYTES = 2 * 1024 * 1024;
const SALA_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getSalaAvatarExtension(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

export function validateSalaAvatarFile(file: File): string | null {
  if (!SALA_AVATAR_TYPES.has(file.type)) {
    return "Usá una imagen JPG, PNG o WebP.";
  }
  if (file.size > MAX_SALA_AVATAR_BYTES) {
    return "La imagen debe pesar menos de 2 MB.";
  }
  return null;
}

/** Sube la foto y actualiza salas.avatar_url. Solo owner (RLS + storage). */
export async function uploadSalaAvatar(
  salaId: number,
  file: File,
): Promise<string> {
  const validationError = validateSalaAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const extension = getSalaAvatarExtension(file.type);
  const path = `${salaId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("sala-avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    if (uploadError.message.includes("Bucket not found")) {
      throw new Error(
        "Falta configurar el bucket de fotos de sala. Ejecutá supabase/sala-avatars.sql.",
      );
    }
    throw new Error(uploadError.message);
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
    throw new Error(updateError.message);
  }

  return avatarUrl;
}
