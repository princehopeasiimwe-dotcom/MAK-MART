/* global process */
// Vercel serverless function: /api/upload/delete
// A signed-in user can delete only files inside their own folder.

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const FOLDERS = ["products", "events", "services", "vendors", "providers", "users", "chat", "temp"];

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

export default async function handler(req, res) {
  if (process.env.ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Please sign in." });

  const { key } = req.body || {};
  if (!keyIsOwnedBy(key, userId)) {
    return res.status(403).json({ error: "You can only delete your own files." });
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
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || "mak-mart", Key: key })
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Could not delete the file." });
  }
}