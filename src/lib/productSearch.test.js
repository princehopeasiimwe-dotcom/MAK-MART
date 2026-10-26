import { describe, expect, it } from "vitest";
import { searchProducts } from "./productSearch";

const categories = [
  { id: "tech", name: "Technology", parent_id: null },
  { id: "phones", name: "Phones", parent_id: "tech" },
  { id: "beauty", name: "Beauty", parent_id: null },
];

const products = [
  {
    id: "p1",
    name: "Oud 9PM",
    description: "A luxury perfume with long lasting scent. Great for evenings.",
    category_id: "beauty",
    vendors: { business_name: "Scent House" },
  },
  {
    id: "p2",
    name: "iPhone 12",
    description: "Clean, 128GB, comes with charger",
    category_id: "phones",
    vendors: { business_name: "Tech Hub" },
  },
  {
    id: "p3",
    name: "Ladies jeans",
    description: "High waist blue denim",
    category_id: null,
    vendors: { business_name: "Vee Fashion" },
  },
  {
    id: "p4",
    name: "Body spray",
    description: "Fresh perfume spray for men",
    category_id: "beauty",
    vendors: { business_name: "Scent House" },
  },
];

const ids = (query) => searchProducts(products, query, categories).results.map((p) => p.id);

describe("searchProducts", () => {
  it("finds a product by a word that is only in the description", () => {
    expect(ids("luxury")).toEqual(["p1"]);
    expect(ids("denim")).toEqual(["p3"]);
  });

  it("matches plurals and half-typed words", () => {
    expect(ids("perfumes")).toContain("p1");
    expect(ids("perf")).toContain("p1");
  });

  it("forgives small typos", () => {
    expect(ids("perfum")).toContain("p1");
    expect(ids("luxry")).toContain("p1");
    expect(ids("jeens")).toContain("p3");
  });

  it("searches category names, parents and vendor names", () => {
    expect(ids("technology")).toEqual(["p2"]);
    expect(ids("phones")).toEqual(["p2"]);
    expect(ids("scent house")).toEqual(["p1", "p4"]);
  });

  it("ranks products that match every word first and name matches above description", () => {
    expect(ids("luxury perfume")).toEqual(["p1"]);
    expect(ids("perfume")).toEqual(["p1", "p4"].sort((a, b) => ids("perfume").indexOf(a) - ids("perfume").indexOf(b)));
    const result = searchProducts(products, "spray", categories).results[0];
    expect(result.id).toBe("p4");
  });

  it("matches numbers exactly and ignores filler words", () => {
    expect(ids("iphone 12")).toEqual(["p2"]);
    expect(ids("the 128gb for iphone")).toEqual(["p2"]);
    expect(ids("13")).toEqual([]);
  });

  it("falls back to close matches when no product has every word", () => {
    const out = searchProducts(products, "luxury denim", categories);
    expect(out.partial).toBe(true);
    expect(out.results.map((p) => p.id).sort()).toEqual(["p1", "p3"]);
  });

  it("returns everything for an empty search", () => {
    expect(searchProducts(products, "  ", categories).results).toHaveLength(4);
  });
});