// Where a tapped notification should take the user.
// New notifications carry their own `link` (set by the database triggers);
// older ones are mapped from their `type` so nothing is left unclickable.

const TYPE_LINKS = {
  vendor_pending: "/vendor/dashboard",
  vendor_approved: "/vendor/dashboard",
  provider_pending: "/provider/dashboard",
  provider_approved: "/provider/dashboard",
  new_order: "/vendor/orders",
  order_status: "/account",
};

// Only ever follow links inside this site.
export function isSafeInternalPath(path) {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\")
  );
}

export function getNotificationLink(notification) {
  if (!notification) return null;

  if (isSafeInternalPath(notification.link)) {
    return notification.link;
  }

  if (notification.type === "admin_alert") {
    return /service provider/i.test(notification.title || "")
      ? "/admin/services"
      : "/admin/vendors";
  }

  return TYPE_LINKS[notification.type] || null;
}

// Splits a message into plain text and web links so links inside a
// notification (for example the WhatsApp group) can be tapped too.
export function splitMessageLinks(message) {
  const parts = [];
  const pattern = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  let match;

  while ((match = pattern.exec(message || "")) !== null) {
    let url = match[0];
    let trailing = "";

    while (/[.,;:!?)]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }

    if (match.index > last) {
      parts.push({ type: "text", value: message.slice(last, match.index) });
    }

    parts.push({ type: "link", value: url });

    if (trailing) {
      parts.push({ type: "text", value: trailing });
    }

    last = match.index + match[0].length;
  }

  if (last < (message || "").length) {
    parts.push({ type: "text", value: message.slice(last) });
  }

  return parts;
}