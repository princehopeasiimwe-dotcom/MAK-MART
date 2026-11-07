// Synonym/alias map for smart search — expands queries to find "similar stuff"
// Add more based on your catalog and user search analytics

export const SYNONYMS = {
  // Electronics
  phone: ['mobile', 'smartphone', 'cell', 'iphone', 'android', 'handset'],
  laptop: ['notebook', 'macbook', 'computer', 'pc', 'ultrabook', 'chromebook'],
  tv: ['television', 'smart tv', 'monitor', 'screen', 'display'],
  headphone: ['headphones', 'earphone', 'earphones', 'earbuds', 'airpods', 'headset'],
  charger: ['charging cable', 'power adapter', 'cord', 'lightning cable', 'usb-c cable'],
  tablet: ['ipad', 'tablet pc', 'tab'],
  camera: ['dslr', 'mirrorless', 'camcorder', 'webcam'],
  speaker: ['bluetooth speaker', 'portable speaker', 'sound system'],
  watch: ['smartwatch', 'fitbit', 'apple watch', 'wearable'],

  // Fashion
  sneakers: ['shoes', 'trainers', 'kicks', 'running shoes', 'sports shoes', 'athletic shoes'],
  tshirt: ['t-shirt', 'tee', 'shirt', 'top'],
  hoodie: ['hooded sweatshirt', 'sweatshirt', 'jumper', 'pullover'],
  jeans: ['denim', 'pants', 'trousers', 'bottoms'],
  dress: ['gown', 'frock', 'outfit'],
  bag: ['backpack', 'handbag', 'purse', 'tote', 'satchel', 'rucksack'],
  wallet: ['billfold', 'card holder', 'coin purse'],
  belt: ['waist belt', 'leather belt'],
  cap: ['hat', 'baseball cap', 'snapback', 'beanie'],
  sunglasses: ['shades', 'sun glasses', 'eyewear'],

  // Books & Stationery
  book: ['novel', 'textbook', 'manual', 'guide', 'ebook', 'paperback', 'hardcover'],
  notebook: ['notepad', 'journal', 'diary', 'planner', 'exercise book'],
  pen: ['ballpoint', 'gel pen', 'marker', 'highlighter', 'pencil'],
  calculator: ['scientific calculator', 'graphing calculator'],

  // Food
  food: ['meal', 'snack', 'drink', 'beverage', 'groceries'],
  pizza: ['pizzas'],
  burger: ['burgers', 'hamburger', 'cheeseburger'],
  chicken: ['chicken wings', 'fried chicken', 'grilled chicken'],
  rice: ['jollof', 'fried rice', 'white rice'],
  drink: ['beverage', 'juice', 'soda', 'soft drink', 'water', 'energy drink'],

  // Home & Living
  lamp: ['light', 'bulb', 'led light', 'desk lamp', 'floor lamp'],
  chair: ['seat', 'office chair', 'gaming chair', 'stool'],
  table: ['desk', 'dining table', 'coffee table', 'study table'],
  bed: ['mattress', 'bed frame', 'bedding', 'sheets', 'duvet', 'pillow'],
  curtain: ['curtains', 'drapes', 'blinds', 'window treatment'],
  rug: ['carpet', 'mat', 'floor mat'],

  // Beauty & Health
  perfume: ['perfumes', 'fragrance', 'cologne', 'scent', 'body spray', 'eau de parfum'],
  cream: ['lotion', 'moisturizer', 'body cream', 'face cream'],
  soap: ['body wash', 'shower gel', 'hand wash'],
  shampoo: ['conditioner', 'hair care'],
  makeup: ['cosmetics', 'beauty products'],

  // Services
  service: ['services', 'help', 'assistance', 'repair', 'fix'],
  delivery: ['shipping', 'courier', 'transport'],
  printing: ['print', 'photocopy', 'photocopying'],
  tutoring: ['tutor', 'lessons', 'coaching', 'classes'],
};

// Expand query tokens with synonyms
export function expandQuery(tokens) {
  const expanded = [...tokens];
  for (const token of tokens) {
    const syns = SYNONYMS[token];
    if (syns) {
      expanded.push(...syns);
    }
  }
  return [...new Set(expanded)];
}

// Reverse lookup: find canonical term for a synonym (useful for highlighting)
export function findCanonical(token) {
  for (const [canonical, syns] of Object.entries(SYNONYMS)) {
    if (canonical === token || syns.includes(token)) {
      return canonical;
    }
  }
  return token;
}