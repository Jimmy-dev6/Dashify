import { createClient } from "@/lib/supabase/client";

const BUCKET = "property-photos";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type PhotoUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Format non supporté. Utilise JPG, PNG, WEBP ou GIF.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMo = (file.size / 1024 / 1024).toFixed(1);
    return `Fichier trop lourd (${sizeMo} Mo). Maximum 5 Mo.`;
  }
  if (file.size === 0) {
    return "Fichier vide.";
  }
  return null;
}

export async function uploadPropertyPhoto(
  file: File,
  propertyId: string,
): Promise<PhotoUploadResult> {
  const validationError = validatePhotoFile(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Non authentifié. Reconnecte-toi." };
  }

  const timestamp = Date.now();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const fileName = `${timestamp}-${baseName || "photo"}.${ext}`;
  const path = `${user.id}/${propertyId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[uploadPropertyPhoto] upload error:", uploadError);
    return { ok: false, error: `Upload échoué : ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  if (!publicUrlData?.publicUrl) {
    return { ok: false, error: "URL publique introuvable après upload." };
  }

  return { ok: true, url: publicUrlData.publicUrl, path };
}

export async function deletePropertyPhoto(path: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("[deletePropertyPhoto] delete error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function extractPathFromPublicUrl(url: string): string | null {
  const match = url.match(
    new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`),
  );
  return match?.[1] ?? null;
}