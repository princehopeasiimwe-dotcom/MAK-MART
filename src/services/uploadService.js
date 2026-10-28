import { supabase } from "../lib/supabase";
import { generateR2Key, getR2PublicUrl, R2_FOLDERS, UPLOAD_CONFIG } from "../lib/r2";

// Configuration - set to 'r2' to use Cloudflare R2, 'supabase' for Supabase Storage
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || "r2";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Build API URL with base path
 */
function getApiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Upload a file to the configured storage provider
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Folder prefix (e.g., 'products', 'events')
 * @param {string} options.userId - Optional user ID for organization
 * @param {string} options.bucket - Supabase bucket name (if using Supabase)
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadFile(file, options = {}) {
  const { folder = "uploads", userId = null, bucket = "uploads" } = options;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (STORAGE_PROVIDER === "r2") {
    return uploadToR2(file, folder, userId);
  } else {
    return uploadToSupabase(file, folder, userId, bucket);
  }
}

/**
 * Upload to Cloudflare R2 via presigned URL
 * Requires a backend endpoint at /api/upload/presign that returns a presigned URL
 */
async function uploadToR2(file, folder, userId) {
  const key = generateR2Key(folder, file.name, userId);

  try {
    // Step 1: Get presigned URL from backend
    const presignResponse = await fetch(getApiUrl("/api/upload/presign"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        contentType: file.type,
        expiresIn: 3600, // 1 hour
      }),
    });

    if (!presignResponse.ok) {
      const error = await presignResponse.json().catch(() => ({}));
      throw new Error(error.message || "Failed to get presigned URL");
    }

    const { presignedUrl } = await presignResponse.json();

    // Step 2: Upload directly to R2 using presigned URL
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`R2 upload failed: ${uploadResponse.statusText}`);
    }

    // Step 3: Return public URL
    return getR2PublicUrl(key);
  } catch (error) {
    console.error("R2 upload error:", error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
}

/**
 * Upload to Supabase Storage (fallback/current)
 */
async function uploadToSupabase(file, folder, userId, bucket) {
  const fileName = `${folder}/${userId ? userId + "/" : ""}${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${file.name.split(".").pop()}`;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrlData.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(url, options = {}) {
  const { bucket = "uploads" } = options;

  if (STORAGE_PROVIDER === "r2") {
    // Extract key from R2 URL
    const key = extractR2Key(url);
    if (key) {
      // Would need backend endpoint to delete
      await fetch(getApiUrl("/api/upload/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
    }
  } else {
    // Extract path from Supabase URL
    const path = extractSupabasePath(url, bucket);
    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }
  }
}

/**
 * Validate file before upload
 */
function validateFile(file) {
  const config = UPLOAD_CONFIG.IMAGE;

  if (!config.types.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed: ${config.types.join(", ")}`,
    };
  }

  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${config.maxSize / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Extract R2 key from public URL
 */
function extractR2Key(url) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    // Remove bucket name from path
    const bucketIndex = parts.indexOf("mak-mart"); // or your bucket name
    if (bucketIndex !== -1) {
      return parts.slice(bucketIndex + 1).join("/");
    }
    return parts.join("/");
  } catch {
    return null;
  }
}

/**
 * Extract Supabase storage path from public URL
 */
function extractSupabasePath(url, bucket) {
  try {
    const urlObj = new URL(url);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const index = urlObj.pathname.indexOf(prefix);
    if (index !== -1) {
      return urlObj.pathname.slice(index + prefix.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files, options = {}) {
  const results = [];
  for (const file of files) {
    try {
      const url = await uploadFile(file, options);
      results.push({ success: true, url, file: file.name });
    } catch (error) {
      results.push({ success: false, error: error.message, file: file.name });
    }
  }
  return results;
}

/**
 * Get the current storage provider
 */
export function getStorageProvider() {
  return STORAGE_PROVIDER;
}

export default {
  uploadFile,
  uploadFiles,
  deleteFile,
  getStorageProvider,
  R2_FOLDERS,
  UPLOAD_CONFIG,
};