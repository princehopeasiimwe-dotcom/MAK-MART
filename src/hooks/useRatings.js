import { useEffect, useState } from "react";
import RatingService from "../services/ratingService";
import { indexBy } from "../lib/ranking";

const EMPTY = {
  vendors: new Map(),
  products: new Map(),
  providers: new Map(),
  services: new Map(),
};

// Ratings change slowly, so every page shares one fetch per minute.
let cache = null;
let cacheTime = 0;
let inflight = null;

// Each list is fetched on its own, so if one migration hasn't been run
// yet the other ratings still work and the site keeps its normal order.
const safe = (promise) => promise.catch(() => []);

function load() {
  if (cache && Date.now() - cacheTime < 60_000) return Promise.resolve(cache);
  if (!inflight) {
    inflight = Promise.all([
      safe(RatingService.getVendorStats()),
      safe(RatingService.getProductStats()),
      safe(RatingService.getProviderStats()),
      safe(RatingService.getServiceStats()),
    ])
      .then(([vendors, products, providers, services]) => {
        cache = {
          vendors: indexBy(vendors, "vendor_id"),
          products: indexBy(products, "product_id"),
          providers: indexBy(providers, "provider_id"),
          services: indexBy(services, "service_id"),
        };
        cacheTime = Date.now();
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidateRatings() {
  cache = null;
}

// Returns Maps keyed by id: vendorStats, productStats, providerStats, serviceStats.
export default function useRatings() {
  const [state, setState] = useState(cache || EMPTY);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    vendorStats: state.vendors,
    productStats: state.products,
    providerStats: state.providers,
    serviceStats: state.services,
  };
}