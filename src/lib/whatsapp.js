export function formatWhatsAppNumber(number = "") {
  return String(number)
    .replace(/\D/g, "")
    .replace(/^0/, "256");
}

export function createWhatsAppLink(
  phoneNumber,
  message = ""
) {
  const number =
    formatWhatsAppNumber(phoneNumber);

  const encodedMessage =
    encodeURIComponent(message);

  return `https://wa.me/${number}?text=${encodedMessage}`;
}

export function openWhatsApp(
  phoneNumber,
  message = ""
) {
  const link = createWhatsAppLink(
    phoneNumber,
    message
  );

  window.open(
    link,
    "_blank",
    "noopener,noreferrer"
  );
}

export function createProductOrderMessage(
  product,
  order = {}
) {
  const {
    customerName = "",
    customerPhone = "",
    customerLocation = "",
    quantity = 1,
    notes = "",
  } = order;

  const total =
    Number(product?.price || 0) * Number(quantity || 1);

  return `
Hello, I'd like to place an order on KU Market.

Product: ${product?.name || "Product"}
Price: UGX ${Number(product?.price || 0).toLocaleString()}
Quantity: ${quantity}
Total: UGX ${total.toLocaleString()}

Name: ${customerName}
Phone: ${customerPhone}
${customerLocation ? `Location: ${customerLocation}\n` : ""}${
    notes ? `Note: ${notes}\n` : ""
  }
Please confirm availability. Thank you!
`.trim();
}
