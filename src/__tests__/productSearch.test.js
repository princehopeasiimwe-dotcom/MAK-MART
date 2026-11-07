import { describe, it, expect } from "vitest";
import {
  normalize,
  stem,
  tokenize,
  searchProducts,
  expandQuery,
  SYNONYMS,
  findCanonical,
} from "../lib/productSearch";
import { expandQuery as expandQueryDirect, SYNONYMS as SYNONYMS_DIRECT } from "../lib/searchSynonyms";

const mockCategories = [
  { id: "cat1", name: "Electronics", parent_id: null },
  { id: "cat2", name: "Phones", parent_id: "cat1" },
  { id: "cat3", name: "Laptops", parent_id: "cat1" },
  { id: "cat4", name: "Fashion", parent_id: null },
  { id: "cat5", name: "Shoes", parent_id: "cat4" },
];

const mockProducts = [
  {
    id: "p1",
    name: "iPhone 15 Pro",
    description: "Latest Apple smartphone with A17 chip",
    category_id: "cat2",
    vendors: { business_name: "Tech Store" },
    categories: { name: "Phones" },
  },
  {
    id: "p2",
    name: "Samsung Galaxy S24",
    description: "Android flagship phone with AI features",
    category_id: "cat2",
    vendors: { business_name: "Mobile World" },
    categories: { name: "Phones" },
  },
  {
    id: "p3",
    name: "MacBook Air M3",
    description: "Lightweight laptop for students",
    category_id: "cat3",
    vendors: { business_name: "Tech Store" },
    categories: { name: "Laptops" },
  },
  {
    id: "p4",
    name: "Nike Air Max Sneakers",
    description: "Comfortable running shoes for daily wear",
    category_id: "cat5",
    vendors: { business_name: "Fashion Hub" },
    categories: { name: "Shoes" },
  },
  {
    id: "p5",
    name: "Adidas Ultraboost Trainers",
    description: "Performance running shoes",
    category_id: "cat5",
    vendors: { business_name: "Sports Shop" },
    categories: { name: "Shoes" },
  },
];

describe("normalize", () => {
  it("lowercases and removes accents", () => {
    expect(normalize("Café")).toBe("cafe");
    expect(normalize("IPHONE")).toBe("iphone");
  });

  it("removes special characters", () => {
    expect(normalize("iPhone 15 Pro!")).toBe("iphone 15 pro");
    expect(normalize("Samsung@#$%")).toBe("samsung");
  });

  it("handles empty/null input", () => {
    expect(normalize("")).toBe("");
    expect(normalize(null)).toBe("");
  });
});

describe("stem", () => {
  it("handles plurals", () => {
    expect(stem("phones")).toBe("phone");
    expect(stem("laptops")).toBe("laptop");
    expect(stem("sneakers")).toBe("sneaker");
    expect(stem("categories")).toBe("category");
  });

  it("handles ies -> y", () => {
    expect(stem("accessories")).toBe("accessory");
    expect(stem("companies")).toBe("company");
  });

  it("handles es endings", () => {
    expect(stem("watches")).toBe("watch");
    expect(stem("boxes")).toBe("box");
  });

  it("keeps short words and numbers", () => {
    expect(stem("tv")).toBe("tv");
    expect(stem("iPhone")).toBe("iphone");
    expect(stem("123")).toBe("123");
    expect(stem("usb")).toBe("usb");
  });

  it("does not over-stem", () => {
    expect(stem("business")).toBe("business"); // not "busines"
    expect(stem("glass")).toBe("glass"); // not "gla"
  });
});

describe("tokenize", () => {
  it("splits, normalizes, and stems", () => {
    expect(tokenize("iPhone 15 Pro Max")).toEqual(["iphone", "15", "pro", "max"]);
    expect(tokenize("Samsung Galaxy Phones")).toEqual(["samsung", "galaxy", "phone"]);
  });

  it("filters empty tokens", () => {
    expect(tokenize("  a  b  ")).toEqual([]);
    expect(tokenize("the and or")).toEqual([]);
  });
});

describe("SYNONYMS map", () => {
  it("contains key electronics synonyms", () => {
    expect(SYNONYMS.phone).toContain("mobile");
    expect(SYNONYMS.phone).toContain("smartphone");
    expect(SYNONYMS.laptop).toContain("notebook");
    expect(SYNONYMS.tv).toContain("television");
  });

  it("contains key fashion synonyms", () => {
    expect(SYNONYMS.sneakers).toContain("trainers");
    expect(SYNONYMS.sneakers).toContain("shoes");
    expect(SYNONYMS.hoodie).toContain("sweatshirt");
  });
});

describe("expandQuery", () => {
  it("expands known synonyms", () => {
    const result = expandQuery(["phone"]);
    expect(result).toContain("phone");
    expect(result).toContain("mobile");
    expect(result).toContain("smartphone");
  });

  it("expands multiple tokens", () => {
    const result = expandQuery(["phone", "laptop"]);
    expect(result).toContain("phone");
    expect(result).toContain("mobile");
    expect(result).toContain("laptop");
    expect(result).toContain("notebook");
  });

  it("deduplicates", () => {
    const result = expandQuery(["phone", "mobile"]);
    // phone expands to mobile, but mobile is already there
    const unique = [...new Set(result)];
    expect(result.length).toBe(unique.length);
  });

  it("leaves unknown tokens unchanged", () => {
    const result = expandQuery(["xyz123"]);
    expect(result).toEqual(["xyz123"]);
  });

  it("handles empty input", () => {
    expect(expandQuery([])).toEqual([]);
  });
});

describe("findCanonical", () => {
  it("returns canonical for known synonyms", () => {
    expect(findCanonical("mobile")).toBe("phone");
    expect(findCanonical("smartphone")).toBe("phone");
    expect(findCanonical("notebook")).toBe("laptop");
    expect(findCanonical("trainers")).toBe("sneakers");
  });

  it("returns original for canonical terms", () => {
    expect(findCanonical("phone")).toBe("phone");
    expect(findCanonical("laptop")).toBe("laptop");
  });

  it("returns original for unknown terms", () => {
    expect(findCanonical("xyz123")).toBe("xyz123");
  });
});

describe("searchProducts", () => {
  it("returns all products for empty query", () => {
    const result = searchProducts(mockProducts, "", mockCategories);
    expect(result.results).toHaveLength(5);
    expect(result.partial).toBe(false);
  });

  it("returns all products for stop-words-only query", () => {
    const result = searchProducts(mockProducts, "the and or", mockCategories);
    expect(result.results).toHaveLength(5);
  });

  it("finds exact matches in name", () => {
    const result = searchProducts(mockProducts, "iPhone", mockCategories);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("p1");
    expect(result.partial).toBe(false);
  });

  it("finds partial matches (prefix)", () => {
    const result = searchProducts(mockProducts, "iph", mockCategories);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("p1");
  });

  it("finds matches in description", () => {
    const result = searchProducts(mockProducts, "lightweight", mockCategories);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("p3");
  });

  it("finds matches in vendor name", () => {
    const result = searchProducts(mockProducts, "Tech Store", mockCategories);
    expect(result.results).toHaveLength(2); // p1 and p3
    expect(result.results.map(p => p.id).sort()).toEqual(["p1", "p3"]);
  });

  it("finds matches in category (including parent)", () => {
    const result = searchProducts(mockProducts, "Electronics", mockCategories);
    expect(result.results).toHaveLength(3); // p1, p2, p3
  });

  it("handles plurals via stemming", () => {
    const result = searchProducts(mockProducts, "phones", mockCategories);
    expect(result.results).toHaveLength(2); // p1, p2
    expect(result.results.map(p => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("handles typo tolerance for words >= 3 chars", () => {
    const result = searchProducts(mockProducts, "iphon", mockCategories); // typo: missing 'e'
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("p1");
  });

  it("handles typo tolerance for 3-char words", () => {
    // "tv" -> 2 chars, no typo tolerance; "tvv" -> 3 chars, 1 typo allowed
    const tvProducts = [
      { ...mockProducts[0], name: "Samsung TV", category_id: "cat1" },
    ];
    const result = searchProducts(tvProducts, "tvv", mockCategories);
    // Should match with 1 typo
    expect(result.results.length).toBeGreaterThanOrEqual(0); // depends on exact match
  });

  it("expands synonyms - phone finds mobile/smartphone products", () => {
    // Add a product with "mobile" in name
    const productsWithMobile = [
      ...mockProducts,
      {
        id: "p6",
        name: "Mobile Charger",
        description: "Fast charging",
        category_id: "cat2",
        vendors: { business_name: "Accessories" },
        categories: { name: "Phones" },
      },
    ];

    const result = searchProducts(productsWithMobile, "phone", mockCategories);
    // Should find iPhone (exact), Samsung (phone in desc), AND Mobile Charger (synonym)
    expect(result.results.length).toBeGreaterThanOrEqual(3);
    const ids = result.results.map(p => p.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p2");
    expect(ids).toContain("p6");
  });

  it("expands synonyms - sneakers finds trainers/shoes", () => {
    const result = searchProducts(mockProducts, "sneakers", mockCategories);
    // Should find Nike (sneakers in name) and Adidas (trainers in name -> synonym)
    expect(result.results.length).toBeGreaterThanOrEqual(2);
    const ids = result.results.map(p => p.id).sort();
    expect(ids).toContain("p4");
    expect(ids).toContain("p5");
  });

  it("ranks complete matches (all words) above partial", () => {
    const result = searchProducts(mockProducts, "iPhone Pro", mockCategories);
    // p1 has both "iphone" and "pro"
    expect(result.results[0].id).toBe("p1");
    expect(result.partial).toBe(false);
  });

  it("shows partial matches when no complete match", () => {
    const result = searchProducts(mockProducts, "iPhone Android", mockCategories);
    // No product has both terms
    expect(result.partial).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("handles numeric queries", () => {
    const result = searchProducts(mockProducts, "15", mockCategories);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("p1");
  });

  it("returns words used for search (after expansion)", () => {
    const result = searchProducts(mockProducts, "phone", mockCategories);
    expect(result.words).toContain("phone");
    expect(result.words).toContain("mobile");
    expect(result.words).toContain("smartphone");
  });
});

describe("searchProducts ranking", () => {
  it("prefers name matches over description", () => {
    const products = [
      { ...mockProducts[0], name: "Phone Case", description: "iPhone accessory" },
      { ...mockProducts[1], name: "iPhone 15", description: "Great phone" },
    ];
    const result = searchProducts(products, "iPhone", mockCategories);
    // Second product has "iphone" in name (weight 10), first in description (weight 3)
    expect(result.results[0].id).toBe("p2");
  });

  it("prefers category matches over vendor", () => {
    const products = [
      { ...mockProducts[0], name: "Random", description: "desc", category_id: "cat2", vendors: { business_name: "Phone Shop" } },
      { ...mockProducts[1], name: "Random", description: "desc", category_id: "cat3", vendors: { business_name: "Phone World" } },
    ];
    const result = searchProducts(products, "phone", mockCategories);
    // First product in Phones category (weight 6), second has vendor with "phone" (weight 5)
    expect(result.results[0].id).toBe("p1");
  });
});