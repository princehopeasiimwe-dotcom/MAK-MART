/* global process */
// Vercel serverless function: /api/upload/presign
// Gives a signed-in user a short-lived link to upload ONE picture into their
// own folder on Cloudflare R2. The secret R2 keys stay here, on the server.
//
// Vercel environment variables needed (NOT starting with VITE_):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
// It also reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, which you already have.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const FOLDERS = ["products", "events", "services", "vendors", "providers", "users", "chat", "temp"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// Who is calling? Ask Supabase to check the sign-in token.
async function getUserId(req) {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id || null;
  } catch {
    return null;
  }
}

// Upload allowance: 40 pictures an hour and 200 a day per person (see migration 033).
// If that database update has not been run yet we let the upload through.
async function withinUploadQuota(req) {
  const token = (req.headers?.authorization || "").slice(7);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/register_upload`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (response.status === 404) return true;
    if (!response.ok) return false;
    return (await response.json()) === true;
  } catch {
    return false;
  }
}

// The key must be  <folder>/<your user id>/<file name>
function keyIsOwnedBy(key, userId) {
  if (typeof key !== "string" || key.length > 200 || key.includes("..")) return false;
  const [folder, owner, file, ...rest] = key.split("/");
  return (
    rest.length === 0 &&
    FOLDERS.includes(folder) &&
    owner === userId &&
    /^[A-Za-z0-9._-]+$/.test(file || "")
  );
}

function setCors(req, res) {
  if (process.env.ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Please sign in to upload photos." });

  const { key, contentType, size } = req.body || {};

  if (!keyIsOwnedBy(key, userId)) {
    return res.status(403).json({ error: "You can only upload into your own folder." });
  }
  if (!IMAGE_TYPES.includes(contentType)) {
    return res.status(400).json({ error: "Please choose a JPG, PNG, WebP or GIF picture." });
  }
  if (!Number.isInteger(size) || size < 1 || size > MAX_BYTES) {
    return res.status(400).json({ error: "Image is too large. Please pick one under 5MB." });
  }

  if (!(await withinUploadQuota(req))) {
    return res.status(429).json({ error: "You have uploaded a lot of pictures. Please try again later." });
  }

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return res.status(500).json({ error: "Photo storage is not set up yet." });
  }

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "mak-mart",
      Key: key,
      ContentType: contentType,
      ContentLength: size, // the upload must be exactly this size
      CacheControl: CACHE_CONTROL,
    });

    // valid for 5 minutes, for this one file only
    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: 300,
      unhoistableHeaders: new Set(["cache-control"]),
      signableHeaders: new Set(["content-type", "content-length", "cache-control"]),
    });

    return res.status(200).json({ presignedUrl, key });
  } catch (error) {
    console.error("Presign error:", error);
    return res.status(500).json({ error: "Could not start the upload." });
  }
}