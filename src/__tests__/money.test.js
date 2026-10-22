import { describe, it, expect } from "vitest";
import { cleanMoney, parseMoney, groupDigits } from "../utils/money";

describe("money input", () => {
  it("understands commas, spaces and currency words", () => {
    expect(parseMoney("35,000")).toBe(35000);
    expect(parseMoney("35 000")).toBe(35000);
    expect(parseMoney("UGX 1,250,000")).toBe(1250000);
    expect(parseMoney("12000")).toBe(12000);
  });
  it("understands k for thousands", () => {
    expect(parseMoney("35k")).toBe(35000);
    expect(parseMoney("1.5k")).toBe(1500);
  });
  it("returns null when nothing usable", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
  it("groups digits for display", () => {
    expect(groupDigits("1250000")).toBe("1,250,000");
    expect(groupDigits("900")).toBe("900");
    expect(cleanMoney("1,5")).toBe("15");
  });
});