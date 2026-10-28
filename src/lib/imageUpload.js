import { uploadFile, UPLOAD_CONFIG } from "../services/uploadService";

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

/**
 * Upload an image to the configured storage provider (R2 or Supabase)
 * @param {string} bucket - Storage bucket/folder name
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID for organizing uploads
 * @returns {Promise<string>} - Public URL of uploaded image
 */
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

  // Shrink image client-side first
  file = await shrinkImage(file);

  // Validate size after shrinking
  const maxSizeBytes = UPLOAD_CONFIG.IMAGE.maxSize; // 5MB
  if (file.size > maxSizeBytes) {
    throw new Error("Image is too large. Please pick one under 5MB.");
  }

  // Map bucket to folder
  const folderMap = {
    "product-images": "products",
    "event-images": "events",
    "service-images": "services",
    "vendor-images": "vendors",
    "provider-images": "providers",
    "user-avatars": "users",
    "chat-attachments": "chat",
  };

  const folder = folderMap[bucket] || bucket;

  // Upload using the unified service
  return uploadFile(file, { folder, userId });
}

/**
 * Upload multiple images
 */
export async function uploadImages(bucket, files, userId) {
  const folderMap = {
    "product-images": "products",
    "event-images": "events",
    "service-images": "services",
    "vendor-images": "vendors",
    "provider-images": "providers",
    "user-avatars": "users",
    "chat-attachments": "chat",
  };

  const folder = folderMap[bucket] || bucket;
  const results = [];

  for (const file of files) {
    try {
      const url = await uploadFile(file, { folder, userId });
      results.push({ success: true, url, file: file.name });
    } catch (error) {
      results.push({ success: false, error: error.message, file: file.name });
    }
  }

  return results;
}

/**
 * Delete an image by URL
 */
export async function deleteImage(url) {
  // This would need a backend endpoint for R2
  // For now, we just log - implement backend deletion
  console.warn("Image deletion not fully implemented for R2. Implement /api/upload/delete endpoint.");
}

export { UPLOAD_CONFIG } from "../services/uploadService";