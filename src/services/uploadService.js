import { supabase } from "../lib/supabase";
import {
  generateR2Key,
  getR2PublicUrl,
  R2_FOLDERS,
  UPLOAD_CONFIG,
} from "../lib/uploadConfig";

// Where photos go. Anything other than "r2" keeps using Supabase Storage,
// exactly as before. Set VITE_STORAGE_PROVIDER=r2 only after Cloudflare R2
// and the /api/upload functions are fully set up.
const STORAGE_PROVIDER =
  import.meta.env.VITE_STORAGE_PROVIDER === "r2" ? "r2" : "supabase";
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const apiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

// The server checks this token, so only signed-in users can upload.
async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Please sign in to upload photos.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function validateFile(file) {
  const config = UPLOAD_CONFIG.IMAGE;

  if (!config.types.includes(file.type)) {
    return `Please choose a JPG, PNG, WebP or GIF picture (this one is ${file.type || "unknown"}).`;
  }
  if (file.size > config.maxSize) {
    return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please pick one under 5MB.`;
  }
  return null;
}

const CACHE_CONTROL = "public, max-age=31536000, immutable";

async function uploadToR2(file, folder, userId) {
  const key = generateR2Key(folder, file.name, userId);

  const presign = await fetch(apiUrl("/api/upload/presign"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ key, contentType: file.type, size: file.size }),
  });

  if (!presign.ok) {
    const body = await presign.json().catch(() => ({}));
    throw new Error(body.error || "Could not start the upload.");
  }

  const { presignedUrl } = await presign.json();

  const put = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type, "Cache-Control": CACHE_CONTROL },
    body: file,
  });

  if (!put.ok) {
    throw new Error("The photo could not be saved. Please try again.");
  }

  return getR2PublicUrl(key);
}

// Same behaviour as before: <bucket>/<user id>/<file>
async function uploadToSupabase(file, bucket, userId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload one picture and return its public address.
 * options: { folder (R2), bucket (Supabase), userId }
 */
export async function uploadFile(file, options = {}) {
  const { folder = "temp", bucket = "product-images", userId } = options;

  if (!userId) throw new Error("You must be signed in to upload images.");

  const problem = validateFile(file);
  if (problem) throw new Error(problem);

  return STORAGE_PROVIDER === "r2"
    ? uploadToR2(file, folder, userId)
    : uploadToSupabase(file, bucket, userId);
}

export async function uploadFiles(files, options = {}) {
  const results = [];
  for (const file of files) {
    try {
      results.push({ success: true, url: await uploadFile(file, options), file: file.name });
    } catch (error) {
      results.push({ success: false, error: error.message, file: file.name });
    }
  }
  return results;
}

// R2 files are removed by the server, which checks the file belongs to you.
export async function deleteFile(url) {
  if (STORAGE_PROVIDER !== "r2") return;

  const base = import.meta.env.VITE_R2_PUBLIC_URL;
  if (!base || !String(url).startsWith(base)) return;

  const key = String(url).slice(String(base).replace(/\/+$/, "").length + 1);
  await fetch(apiUrl("/api/upload/delete"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ key }),
  });
}

export function getStorageProvider() {
  return STORAGE_PROVIDER;
}

export { R2_FOLDERS, UPLOAD_CONFIG };

export default { uploadFile, uploadFiles, deleteFile, getStorageProvider, R2_FOLDERS, UPLOAD_CONFIG };