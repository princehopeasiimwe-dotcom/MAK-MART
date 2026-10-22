export function isRequired(value) {
  return Boolean(
    value && String(value).trim()
  );
}

export function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export function isValidPhone(phone = "") {
  return /^[+\d][\d\s-]{7,20}$/.test(
    phone
  );
}

export function isValidPrice(price) {
  return (
    Number.isFinite(Number(price)) &&
    Number(price) > 0
  );
}

export function validateProduct(product) {
  const errors = {};

  if (!isRequired(product.name)) {
    errors.name =
      "Product name is required.";
  }

  if (!isValidPrice(product.price)) {
    errors.price =
      "Enter a valid product price.";
  }

  if (!isRequired(product.category)) {
    errors.category =
      "Product category is required.";
  }

  return errors;
}