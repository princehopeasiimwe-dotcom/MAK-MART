// Cloudflare Worker / Vercel / Netlify Function for R2 Presigned URLs
// Deploy this as a serverless function at /api/upload/presign

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Environment variables (set in your platform's dashboard)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "mak-mart";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Allowed folders for security
const ALLOWED_FOLDERS = [
  "products",
  "events",
  "services",
  "vendors",
  "providers",
  "users",
  "chat",
  "temp",
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { key, contentType, expiresIn = 3600 } = req.body;

    // Validate key format (must be in allowed folder)
    const folder = key.split("/")[0];
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json({ error: "Invalid folder" });
    }

    // Validate content type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: "File type not allowed" });
    }

    // Generate presigned URL for PUT (upload)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });

    return res.status(200).json({ presignedUrl, key });
  } catch (error) {
    console.error("Presign error:", error);
    return res.status(500).json({ error: "Failed to generate presigned URL" });
  }
}