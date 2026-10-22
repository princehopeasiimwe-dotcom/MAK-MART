export function formatCurrency(
  amount = 0,
  currency = "UGX"
) {
  return new Intl.NumberFormat(
    "en-UG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(amount) || 0);
}

export function formatUGX(amount = 0) {
  return formatCurrency(amount, "UGX");
}