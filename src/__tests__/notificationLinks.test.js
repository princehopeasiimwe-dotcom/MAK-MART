import { describe, expect, it } from "vitest";
import {
  getNotificationLink,
  isSafeInternalPath,
  splitMessageLinks,
} from "../lib/notificationLinks";

describe("getNotificationLink", () => {
  it("uses the link saved on the notification", () => {
    expect(getNotificationLink({ link: "/vendor/orders", type: "x" })).toBe("/vendor/orders");
  });

  it("falls back to the notification type for older rows", () => {
    expect(getNotificationLink({ type: "vendor_approved" })).toBe("/vendor/dashboard");
    expect(getNotificationLink({ type: "order_status" })).toBe("/account");
  });

  it("sends admin alerts to the right admin page", () => {
    expect(getNotificationLink({ type: "admin_alert", title: "New vendor awaiting approval" })).toBe("/admin/vendors");
    expect(getNotificationLink({ type: "admin_alert", title: "New service provider awaiting approval" })).toBe("/admin/services");
  });

  it("never follows links that leave the site", () => {
    expect(getNotificationLink({ link: "https://evil.example", type: "general" })).toBeNull();
    expect(getNotificationLink({ link: "//evil.example", type: "general" })).toBeNull();
    expect(isSafeInternalPath("/ok")).toBe(true);
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
  });

  it("returns null when there is nowhere to go", () => {
    expect(getNotificationLink({ type: "general" })).toBeNull();
  });
});

describe("splitMessageLinks", () => {
  it("makes web links tappable and keeps punctuation out of them", () => {
    const parts = splitMessageLinks("Join here: https://chat.whatsapp.com/abc123.");
    expect(parts).toEqual([
      { type: "text", value: "Join here: " },
      { type: "link", value: "https://chat.whatsapp.com/abc123" },
      { type: "text", value: "." },
    ]);
  });

  it("leaves plain text alone", () => {
    expect(splitMessageLinks("No links")).toEqual([{ type: "text", value: "No links" }]);
  });
});