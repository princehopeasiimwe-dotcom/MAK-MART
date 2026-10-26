// Helpers for categories that can sit inside other categories
// (Technology > Phones > iPhones). Works on the flat list from Supabase.

export function byName(a, b) {
  return (a.name || "").localeCompare(b.name || "");
}

export function indexCategories(categories = []) {
  const byId = new Map();
  const children = new Map();

  categories.forEach((category) => byId.set(category.id, category));

  categories.forEach((category) => {
    // a parent we cannot see (hidden or deleted) counts as "no parent"
    const parent = byId.has(category.parent_id) ? category.parent_id : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(category);
  });

  children.forEach((list) => list.sort(byName));
  return { byId, children };
}

export function topLevel(categories = []) {
  return indexCategories(categories).children.get(null) || [];
}

export function childrenOf(categories = [], id) {
  return indexCategories(categories).children.get(id) || [];
}

// [root, ..., category] for a category id. Empty if the id is unknown.
export function chainOf(categories = [], id) {
  const { byId } = indexCategories(categories);
  const chain = [];
  let current = byId.get(id);
  let guard = 0;

  while (current && guard < 10) {
    chain.unshift(current);
    current = byId.get(current.parent_id);
    guard += 1;
  }
  return chain;
}

export function pathLabel(categories = [], id, separator = " › ") {
  return chainOf(categories, id)
    .map((category) => category.name)
    .join(separator);
}

// The category plus everything underneath it
export function descendantIds(categories = [], id) {
  const { children } = indexCategories(categories);
  const result = [];
  const stack = [id];

  while (stack.length) {
    const next = stack.pop();
    result.push(next);
    (children.get(next) || []).forEach((child) => stack.push(child.id));
  }
  return result;
}

// How many levels sit under (and including) this category: 1 = no children
export function heightOf(categories = [], id) {
  const { children } = indexCategories(categories);
  const walk = (node) => {
    const kids = children.get(node) || [];
    return 1 + (kids.length ? Math.max(...kids.map((kid) => walk(kid.id))) : 0);
  };
  return walk(id);
}

// Whole tree, parents first, each with its depth (1 = top level) and path
export function flattenTree(categories = []) {
  const { children } = indexCategories(categories);
  const rows = [];

  const walk = (parentId, depth, trail) => {
    (children.get(parentId) || []).forEach((category) => {
      const path = [...trail, category.name];
      rows.push({ ...category, depth, path: path.join(" › ") });
      walk(category.id, depth + 1, path);
    });
  };

  walk(null, 1, []);
  return rows;
}