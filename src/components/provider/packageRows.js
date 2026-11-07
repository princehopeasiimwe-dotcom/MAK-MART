export const MAX_PACKAGES = 20;

let counter = 0;
export const newPackageRow = (row = {}) => ({
  key: `pk-${Date.now()}-${counter++}`,
  name: row.name || "",
  price: row.price != null ? String(Math.round(Number(row.price))) : "",
  unit: row.unit || "",
  description: row.description || "",
});