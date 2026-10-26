import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import useProducts from "../../hooks/useProducts";
import useRatings from "../../hooks/useRatings";
import { rankProducts } from "../../lib/ranking";
import {
  chainOf,
  childrenOf,
  descendantIds,
  flattenTree,
  topLevel,
} from "../../lib/categoryTree";
import ProductService from "../../services/ProductService";
import ProductGrid from "../../components/marketplace/productGrid";
import ProductRow from "../../components/marketplace/ProductRow";
import SearchBar from "../../components/marketplace/SearchBar";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";

import usePageSeo from "../../hooks/usePageSeo";

const ROW_LIMIT = 14;

// Puts each product on the right shelf.
// - no category chosen: shelves are the sub-categories (Phones, Men's shirts...)
//   and a product sitting directly in a main category gets that category's shelf.
// - a category chosen: shelves are the categories directly inside it.
function buildShelves(products, categories, rootId) {
  const order = new Map(flattenTree(categories).map((c, i) => [c.id, i]));
  const shelves = new Map();

  const add = (key, shelf, product) => {
    if (!shelves.has(key)) shelves.set(key, { key, ...shelf, products: [] });
    shelves.get(key).products.push(product);
  };

  products.forEach((product) => {
    const chain = chainOf(categories, product.category_id);

    if (!rootId) {
      if (!chain.length) {
        add("more", { title: "More", sort: 1e9 }, product);
        return;
      }
      const pick = chain.length >= 2 ? chain[1] : chain[0];
      add(
        pick.id,
        {
          title: pick.name,
          eyebrow: chain.length >= 2 ? chain[0].name : null,
          to: `/marketplace/products?category=${pick.id}`,
          sort: order.get(pick.id) ?? 1e8,
        },
        product
      );
      return;
    }

    const at = chain.findIndex((c) => c.id === rootId);
    if (at === -1) return;

    if (at === chain.length - 1) {
      add(
        "self",
        { title: `Other ${chain[at].name}`, sort: 1e9 },
        product
      );
      return;
    }

    const pick = chain[at + 1];
    add(
      pick.id,
      {
        title: pick.name,
        to: `/marketplace/products?category=${pick.id}`,
        sort: order.get(pick.id) ?? 1e8,
      },
      product
    );
  });

  return [...shelves.values()].sort((a, b) => a.sort - b.sort);
}

function Products() {
  usePageSeo({ title: "Browse products", description: "Shop products from trusted Makerere University student vendors: electronics, fashion, books, food and more." });

  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || null;

  const { products: rawProducts, loading, error } = useProducts({ search });

  const { vendorStats, productStats } = useRatings();
  const ranked = useMemo(
    () => rankProducts(rawProducts, vendorStats, productStats),
    [rawProducts, vendorStats, productStats]
  );

  const [categories, setCategories] = useState([]);
  const [categoriesReady, setCategoriesReady] = useState(false);

  useEffect(() => {
    ProductService.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCategoriesReady(true));
  }, []);

  const chain = useMemo(
    () => (category ? chainOf(categories, category) : []),
    [categories, category]
  );
  const subCategories = useMemo(
    () => (category ? childrenOf(categories, category) : []),
    [categories, category]
  );

  // everything in the chosen category, including its sub-categories
  const inCategory = useMemo(() => {
    if (!category) return ranked;
    const ids = new Set(descendantIds(categories, category));
    return ranked.filter((product) => ids.has(product.category_id));
  }, [ranked, categories, category]);

  const shelves = useMemo(
    () => buildShelves(inCategory, categories, category),
    [inCategory, categories, category]
  );

  const handleSearch = (query) => {
    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;
    setSearchParams(params);
  };

  // shelves for browsing; a flat grid for searching or for a category with nothing inside it
  const showShelves = !search && (!category || subCategories.length > 0);
  const waiting = loading || !categoriesReady;

  return (
    <section className="page products-page">
      <div className="page-header">
        <span className="eyebrow">MAK MART MARKETPLACE</span>

        <h1>Explore Products</h1>

        <p>Discover products sold by student entrepreneurs.</p>
      </div>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search MAK MART..."
      />

      <nav className="mm-catbar" aria-label="Categories">
        <Link
          to="/marketplace/products"
          className={!category ? "is-active" : ""}
        >
          All
        </Link>
        {topLevel(categories).map((item) => (
          <Link
            key={item.id}
            to={`/marketplace/products?category=${item.id}`}
            className={chain[0]?.id === item.id ? "is-active" : ""}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {category && chain.length > 0 && (
        <div className="mm-crumbs" aria-label="You are here">
          <Link to="/marketplace/products">All</Link>
          {chain.map((item, index) => (
            <span key={item.id}>
              <ChevronRight size={14} aria-hidden="true" />
              {index === chain.length - 1 ? (
                <strong>{item.name}</strong>
              ) : (
                <Link to={`/marketplace/products?category=${item.id}`}>
                  {item.name}
                </Link>
              )}
            </span>
          ))}
        </div>
      )}

      {category && subCategories.length > 0 && (
        <nav className="mm-catbar mm-catbar--sub" aria-label="Sub-categories">
          {subCategories.map((item) => (
            <Link
              key={item.id}
              to={`/marketplace/products?category=${item.id}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      {search && (
        <div className="active-filter">
          Results for <strong>“{search}”</strong>
        </div>
      )}

      {showShelves ? (
        waiting ? (
          <Loader text="Loading products..." />
        ) : error ? (
          <div className="marketplace-error">
            <p>{error}</p>
          </div>
        ) : shelves.length === 0 ? (
          <EmptyState
            title="No products found"
            message="There are no products here right now."
          />
        ) : (
          shelves.map((shelf) => (
            <ProductRow
              key={shelf.key}
              title={shelf.title}
              eyebrow={shelf.eyebrow}
              to={shelf.to}
              products={shelf.products.slice(0, ROW_LIMIT)}
            />
          ))
        )
      ) : (
        <ProductGrid
          products={inCategory}
          loading={waiting}
          error={error}
        />
      )}
    </section>
  );
}

export default Products;