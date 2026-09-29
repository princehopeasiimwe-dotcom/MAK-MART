import { supabase } from "./supabase";

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

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSizeBytes) {
    throw new Error("Image must be smaller than 5MB.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
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