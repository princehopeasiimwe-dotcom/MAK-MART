import { describe, it, expect } from "vitest";
import { rankVendors, rankProducts, indexBy } from "../lib/ranking";

describe("ranking", () => {
  const vendorStats = indexBy(
    [
      { vendor_id: "a", rank_score: 3.5 },
      { vendor_id: "b", rank_score: 4.6 },
      { vendor_id: "c", rank_score: 4.1 },
    ],
    "vendor_id"
  );

  it("puts the best-rated vendor first", () => {
    const out = rankVendors([{ id: "a" }, { id: "b" }, { id: "c" }], vendorStats);
    expect(out.map((v) => v.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps the original order when nothing is rated yet", () => {
    const list = [{ id: "x" }, { id: "y" }];
    expect(rankVendors(list, new Map())).toBe(list);
  });

  it("keeps ties in their original (newest-first) order", () => {
    const out = rankVendors([{ id: "p" }, { id: "q" }], indexBy([{ vendor_id: "p", rank_score: 4 }, { vendor_id: "q", rank_score: 4 }], "vendor_id"));
    expect(out.map((v) => v.id)).toEqual(["p", "q"]);
  });

  it("ranks products by vendor first, then the product's own rating", () => {
    const productStats = indexBy([{ product_id: "p2", rank_score: 4.9 }, { product_id: "p1", rank_score: 3.6 }], "product_id");
    const out = rankProducts(
      [
        { id: "p1", vendor_id: "b" },
        { id: "p2", vendor_id: "b" },
        { id: "p3", vendor_id: "a" },
      ],
      vendorStats,
      productStats
    );
    expect(out.map((p) => p.id)).toEqual(["p2", "p1", "p3"]);
  });
});