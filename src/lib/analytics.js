import { supabase } from "./supabase";

// Anonymous visitor id: a random string the browser makes for itself.
// It is not linked to a name, phone number or account.
const KEY = "mm_visitor_id";
let memoryId = null;
const seen = new Set();

function makeId() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getVisitorId() {
  if (memoryId) return memoryId;
  try {
    let id = localStorage.getItem(KEY);
    if (!id || id.length < 8) {
      id = makeId();
      localStorage.setItem(KEY, id);
    }
    memoryId = id;
  } catch {
    memoryId = makeId();
  }
  return memoryId;
}

function fire(name, args, dedupeKey) {
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  // Tracking must never break the page, so every failure is ignored.
  Promise.resolve(supabase.rpc(name, args)).catch(() => {});
}

export function trackVisit() {
  fire("track_visit", { p_visitor: getVisitorId() }, "visit");
}

export function trackProductView(productId) {
  if (!productId) return;
  fire(
    "track_product_view",
    { p_visitor: getVisitorId(), p_product: productId },
    `product:${productId}`
  );
}