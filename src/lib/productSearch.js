// Smart product search.
// Finds a product when ANY word of the search appears in its name, description,
// category (including parent categories), or vendor name. Handles plurals
// (perfumes = perfume), half-typed words (perf = perfume) and small typos
// (perfum, parfume). Products that contain every word rank first.

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "in", "on", "at", "to", "with",
  "my", "me", "is", "are", "i", "it", "this", "that", "you", "your", "need",
  "want", "buy", "sell", "selling", "looking",
]);

// How much a match in each place is worth
const WEIGHT = { name: 10, category: 6, vendor: 5, description: 3 };

// How good the match itself is
const QUALITY = { exact: 1, prefix: 0.85, inside: 0.6, typo: 0.45 };

export function normalize(text = "") {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stem(word) {
  if (word.length <= 3 || /^\d/.test(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .map(stem);
}

// Edit distance, giving up early once it is larger than `max`
function within(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > max) return false;
    previous = current;
  }

  return previous[b.length] <= max;
}

function matchQuality(token, words) {
  let best = 0;
  const numeric = /^\d+$/.test(token);

  for (const word of words) {
    if (word === token) return QUALITY.exact;
    if (best >= QUALITY.prefix) continue;

    if (!numeric && token.length >= 3 && word.startsWith(token)) {
      best = Math.max(best, QUALITY.prefix);
    } else if (!numeric && token.length >= 4 && word.includes(token)) {
      best = Math.max(best, QUALITY.inside);
    } else if (!numeric && best < QUALITY.typo) {
      const allowed = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
      // short words must at least start the same, to avoid silly matches
      const sameStart = token.length >= 6 || token[0] === word[0];
      if (allowed && sameStart && within(token, word, allowed)) {
        best = QUALITY.typo;
      }
    }
  }

  return best;
}

function pathNames(categories, id) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const names = [];
  let current = byId.get(id);
  let guard = 0;
  while (current && guard < 10) {
    names.push(current.name);
    current = byId.get(current.parent_id);
    guard += 1;
  }
  return names.join(" ");
}

function indexProduct(product, categories) {
  const categoryText =
    pathNames(categories, product.category_id) ||
    product.categories?.name ||
    "";

  return {
    name: tokenize(product.name),
    category: tokenize(categoryText),
    vendor: tokenize(product.vendors?.business_name || ""),
    description: tokenize(product.description || ""),
  };
}

function scoreProduct(index, tokens) {
  let total = 0;
  let matched = 0;

  for (const token of tokens) {
    let best = 0;

    for (const field of Object.keys(WEIGHT)) {
      const quality = matchQuality(token, index[field]);
      best = Math.max(best, quality * WEIGHT[field]);
    }

    if (best > 0) {
      matched += 1;
      total += best;
    }
  }

  return { total, matched };
}

// Returns { results, partial, words }
//   results : matching products, best first
//   partial : true when no product had every word, so these are "close" matches
export function searchProducts(products = [], query = "", categories = []) {
  const words = [
    ...new Set(tokenize(query).filter((word) => !STOP_WORDS.has(word))),
  ];

  if (!words.length) {
    return { results: products, partial: false, words: [] };
  }

  const scored = products
    .map((product, position) => ({
      product,
      position,
      ...scoreProduct(indexProduct(product, categories), words),
    }))
    .filter((entry) => entry.matched > 0);

  const byScore = (a, b) => b.total - a.total || a.position - b.position;

  const complete = scored
    .filter((entry) => entry.matched === words.length)
    .sort(byScore);

  if (complete.length || words.length === 1) {
    return {
      results: complete.map((entry) => entry.product),
      partial: false,
      words,
    };
  }

  // nothing has every word: show the best partial matches instead
  const close = scored
    .sort((a, b) => b.matched - a.matched || byScore(a, b))
    .map((entry) => entry.product);

  return { results: close, partial: close.length > 0, words };
}