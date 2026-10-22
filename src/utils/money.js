// Turns whatever a person typed into a clean whole number string.
//   "35,000" -> "35000"   "35 000" -> "35000"   "UGX 35000" -> "35000"
//   "35k" -> "35000"      "1.5k" -> "1500"
// Returns "" when there is nothing usable.
export function cleanMoney(input) {
  let text = String(input ?? "").trim().toLowerCase();
  if (!text) return "";

  const thousands = /k$/.test(text);
  text = text.replace(/ugx|ush|shs|sh/g, "");

  if (thousands) {
    const n = parseFloat(text.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? String(Math.round(n * 1000)) : "";
  }

  return text.replace(/\D/g, "");
}

export function parseMoney(input) {
  const digits = cleanMoney(input);
  return digits === "" ? null : Number(digits);
}

export function groupDigits(digits) {
  return String(digits ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}