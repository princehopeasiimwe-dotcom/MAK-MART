import { describe, expect, it } from "vitest";
import { formatCurrency } from "../utils/currency";
import { isValidEmail, isValidPhone, isValidPrice } from "../utils/validation";
import { createWhatsAppLink, formatWhatsAppNumber } from "../lib/whatsapp";

describe("whatsapp helpers", () => {
  it("converts local Ugandan numbers to international format", () => {
    expect(formatWhatsAppNumber("0772 123 456")).toBe("256772123456");
    expect(formatWhatsAppNumber("+256772123456")).toBe("256772123456");
  });

  it("builds an encoded wa.me link", () => {
    expect(createWhatsAppLink("0772123456", "Hi there")).toBe(
      "https://wa.me/256772123456?text=Hi%20there"
    );
  });
});

describe("validation", () => {
  it("validates emails, phones and prices", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidPhone("+256772123456")).toBe(true);
    expect(isValidPhone("12")).toBe(false);
    expect(isValidPrice(1500)).toBe(true);
    expect(isValidPrice(0)).toBe(false);
  });
});

describe("currency", () => {
  it("formats UGX without decimals", () => {
    expect(formatCurrency(15000)).toContain("15,000");
  });

  it("treats invalid amounts as zero", () => {
    expect(formatCurrency("abc")).toContain("0");
  });
});