// Sorts so the best-rated vendors come first. The rank_score already
// accounts for how many ratings someone has (see migration 017), and
// ties keep their original order, so unrated items aren't shuffled.

export function indexBy(rows, key) {
  const map = new Map();
  (rows || []).forEach((row) => map.set(row[key], row));
  return map;
}

function stable(list, score) {
  return list
    .map((item, index) => ({ item, index, s: score(item) }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((entry) => entry.item);
}

export function rankVendors(vendors, vendorStats) {
  if (!vendorStats?.size) return vendors;
  return stable(vendors || [], (v) => Number(vendorStats.get(v.id)?.rank_score ?? 0));
}

// Vendor reputation counts most; the product's own rating breaks ties.
export function rankProducts(products, vendorStats, productStats) {
  if (!vendorStats?.size && !productStats?.size) return products;
  return stable(products || [], (p) => {
    const vendorScore = Number(vendorStats?.get(p.vendor_id)?.rank_score ?? 0);
    const productScore = Number(productStats?.get(p.id)?.rank_score ?? 0);
    return vendorScore * 10 + productScore;
  });
}

// Services: the provider's reputation counts most, the service's own rating breaks ties.
export function rankServices(services, providerStats, serviceStats) {
  if (!providerStats?.size && !serviceStats?.size) return services;
  return stable(services || [], (s) => {
    const providerScore = Number(providerStats?.get(s.provider_id)?.rank_score ?? 0);
    const serviceScore = Number(serviceStats?.get(s.id)?.rank_score ?? 0);
    return providerScore * 10 + serviceScore;
  });
}