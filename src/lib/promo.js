// Helpers for promotions (old price crossed out, new price below it).
//
// A product is "on promotion" when it has an old price (compare_at_price)
// that is higher than its current price, and the promotion has not ended.

import { supabase } from "./supabase";

export function isOnPromo(product) {
  const oldPrice = Number(product?.compare_at_price || 0);
  const price = Number(product?.price || 0);
  if (!(oldPrice > price)) return false;

  if (product?.promo_ends_at) {
    const ends = new Date(product.promo_ends_at).getTime();
    if (!Number.isNaN(ends) && ends <= Date.now()) return false;
  }
  return true;
}

// 50,000 -> 40,000 is "20% off"
export function discountPercent(product) {
  const oldPrice = Number(product?.compare_at_price || 0);
  const price = Number(product?.price || 0);
  if (!(oldPrice > price)) return 0;
  return Math.max(1, Math.round((1 - price / oldPrice) * 100));
}

// "Ends today", "Ends tomorrow", "Ends 30 Nov"
export function promoEndsLabel(product) {
  if (!product?.promo_ends_at) return "";
  const ends = new Date(product.promo_ends_at);
  if (Number.isNaN(ends.getTime())) return "";

  const zone = "Africa/Nairobi";
  const day = (date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(date); // 2026-11-30

  const today = day(new Date());
  const tomorrow = day(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const endDay = day(ends);

  if (endDay === today) return "Ends today";
  if (endDay === tomorrow) return "Ends tomorrow";
  return `Ends ${new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "short",
  }).format(ends)}`;
}

// date input value (2026-11-30) -> the last second of that day in Uganda (UTC+3)
export function endOfDayIso(dateValue) {
  return dateValue ? `${dateValue}T23:59:59+03:00` : null;
}

// stored timestamp -> date input value (2026-11-30)
export function dateInputValue(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(date);
}

// Biggest discount first; ties keep their order.
export function sortPromos(products) {
  return (products || [])
    .map((product, index) => ({ product, index, off: discountPercent(product) }))
    .sort((a, b) => b.off - a.off || a.index - b.index)
    .map((entry) => entry.product);
}

// Asks the database to end promotions whose time has passed (the price goes
// back to the old price). Cheap, so it is limited to once every 2 minutes.
let lastRun = 0;
let running = null;

export function endExpiredPromotions() {
  if (running) return running;
  if (Date.now() - lastRun < 2 * 60 * 1000) return Promise.resolve();

  running = Promise.resolve(supabase.rpc("expire_promotions"))
    .catch(() => {})
    .finally(() => {
      lastRun = Date.now();
      running = null;
    });
  return running;
}