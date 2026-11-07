// Cloudflare Worker for R2 Presigned URLs & Deletion
// Uses native R2 binding (env.BUCKET) - no AWS SDK needed
// Deploy with: npx wrangler deploy

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

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status = 200, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

async function handlePresign(request, env) {
  try {
    const { key, contentType, expiresIn = 3600 } = await request.json();

    // Validate key
    const folder = key?.split("/")[0];
    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return jsonResponse({ error: "Invalid folder" }, 400, env);
    }

    // Validate content type
    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return jsonResponse({ error: "File type not allowed" }, 400, env);
    }

    // Generate presigned URL using native R2 binding
    // This creates a signed URL for PUT operation (upload)
    const presignedUrl = await env.BUCKET.createSignedUrl("put", key, {
      expiresIn,
      customMetadata: {
        "content-type": contentType,
      },
    });

    // Add cache control header via query params (R2 respects these)
    const url = new URL(presignedUrl);
    url.searchParams.set("response-cache-control", "public, max-age=31536000, immutable");

    return jsonResponse({ presignedUrl: url.toString(), key }, 200, env);
  } catch (error) {
    console.error("Presign error:", error);
    return jsonResponse({ error: "Failed to generate presigned URL" }, 500, env);
  }
}

async function handleDelete(request, env) {
  try {
    // TODO: Add auth verification
    // const user = await verifyAuth(request, env);
    // if (!user) return jsonResponse({ error: "Unauthorized" }, 401, env);

    const { key } = await request.json();

    if (!key) {
      return jsonResponse({ error: "Key is required" }, 400, env);
    }

    const folder = key.split("/")[0];
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return jsonResponse({ error: "Invalid folder" }, 400, env);
    }

    // Delete using native R2 binding
    await env.BUCKET.delete(key);

    return jsonResponse({ success: true }, 200, env);
  } catch (error) {
    console.error("Delete error:", error);
    return jsonResponse({ error: "Failed to delete file" }, 500, env);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    // Route handling
    if (url.pathname === "/api/upload/presign" && request.method === "POST") {
      return handlePresign(request, env);
    }

    if (url.pathname === "/api/upload/delete" && request.method === "POST") {
      return handleDelete(request, env);
    }

    return jsonResponse({ error: "Not found" }, 404, env);
  },
};