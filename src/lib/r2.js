import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || "mak-mart";
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL; // Optional: custom domain for public access

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn(
    "Cloudflare R2 environment variables are missing. " +
    "Add VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY to your .env file."
  );
}

// Create S3-compatible client for R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Generate a unique key for uploads
export function generateR2Key(folder, fileName, userId = null) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = fileName.split(".").pop().toLowerCase();
  const prefix = userId ? `${folder}/${userId}` : folder;
  return `${prefix}/${timestamp}-${random}.${ext}`;
}

// Upload file to R2 (from browser - uses presigned URL)
export async function uploadToR2(file, folder, userId = null, options = {}) {
  const {
    contentType = file.type,
    cacheControl = "public, max-age=31536000, immutable",
    metadata = {},
  } = options;

  const key = generateR2Key(folder, file.name, userId);

  // For browser uploads, we need a presigned URL from backend
  // This is a client-side helper - actual upload should go through your backend
  // or use a presigned URL endpoint
  throw new Error(
    "Client-side direct upload not implemented. " +
    "Use the /api/upload/presign endpoint to get a presigned URL, then upload directly to R2."
  );
}

// Upload file via presigned URL (browser-friendly)
export async function uploadViaPresignedUrl(presignedUrl, file, options = {}) {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      ...options.headers,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response;
}

// Get public URL for a file
export function getR2PublicUrl(key) {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
}

// Get presigned URL for private files (expires in 1 hour by default)
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// Delete file from R2
export async function deleteFromR2(key) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  await r2Client.send(command);
}

// Folder prefixes for organization
export const R2_FOLDERS = {
  PRODUCTS: "products",
  EVENTS: "events",
  SERVICES: "services",
  VENDORS: "vendors",
  PROVIDERS: "providers",
  USERS: "users",
  CHAT: "chat",
  TEMP: "temp",
};

// Allowed file types and max sizes
export const UPLOAD_CONFIG = {
  IMAGE: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  DOCUMENT: {
    types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  ALL: {
    types: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
    maxSize: 10 * 1024 * 1024,
  },
};

export default r2Client;