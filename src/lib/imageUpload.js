import { supabase } from "./supabase";

// Phone photos are often 3-8MB. Shrink them in the browser first
// (max 1600px on the long side, JPEG) so uploads are fast and cheap.
// If anything goes wrong we just upload the original file.
async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

// Uploads a file into a bucket under a folder named after the
// current auth user (matches the storage RLS policies, which
// require the first path segment to equal auth.uid()).
// Returns the public URL, or throws on failure.
export async function uploadImage(bucket, file, userId) {
  if (!file) {
    throw new Error("No file selected.");
  }

  if (!userId) {
    throw new Error("You must be signed in to upload images.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  file = await shrinkImage(file);

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB (after shrinking)

  if (file.size > maxSizeBytes) {
    throw new Error("Image is too large. Please pick one under 5MB.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}