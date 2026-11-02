// Safe-for-the-browser upload settings. No secret keys live here.
// (The secret R2 keys belong only in the server functions under /api/upload.)

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

export const UPLOAD_CONFIG = {
  IMAGE: {
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
};

// products/<user id>/<time>-<random>.jpg
// The user id in the path is checked by the server, so people can only
// write into (and delete from) their own folder.
export function generateR2Key(folder, fileName, userId) {
  const random = Math.random().toString(36).slice(2, 10);
  const ext = (String(fileName).split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${folder}/${userId}/${Date.now()}-${random}.${ext || "jpg"}`;
}

// The public address of an uploaded file (your R2 public domain).
export function getR2PublicUrl(key) {
  const base = import.meta.env.VITE_R2_PUBLIC_URL;
  if (!base) {
    throw new Error("Photo storage is not set up yet (VITE_R2_PUBLIC_URL is missing).");
  }
  return `${String(base).replace(/\/+$/, "")}/${key}`;
}