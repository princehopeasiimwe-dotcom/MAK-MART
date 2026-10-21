import { useEffect, useState } from "react";
import RatingService from "../services/ratingService";
import { indexBy } from "../lib/ranking";

// Ratings change slowly, so every page shares one fetch per minute.
let cache = null;
let cacheTime = 0;
let inflight = null;

function load() {
  if (cache && Date.now() - cacheTime < 60_000) return Promise.resolve(cache);
  if (!inflight) {
    inflight = Promise.all([RatingService.getVendorStats(), RatingService.getProductStats()])
      .then(([vendors, products]) => {
        cache = { vendors: indexBy(vendors, "vendor_id"), products: indexBy(products, "product_id") };
        cacheTime = Date.now();
        return cache;
      })
      .catch(() => ({ vendors: new Map(), products: new Map() }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateRatings() {
  cache = null;
}

// Returns { vendorStats, productStats } as Maps (empty until loaded or if
// the ratings migration hasn't been run yet - the site just keeps its
// normal order in that case).
export default function useRatings() {
  const [state, setState] = useState(
    cache || { vendors: new Map(), products: new Map() }
  );

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return { vendorStats: state.vendors, productStats: state.products };
}