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
import { searchProducts } from "../../lib/productSearch";
import { isOnPromo, sortPromos } from "../../lib/promo";
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
  const promoOnly = searchParams.get("promo") === "1";

  const { products: rawProducts, loading, error } = useProducts({});

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

  // products on promotion (old price crossed out), biggest discount first
  const promos = useMemo(
    () => sortPromos(inCategory.filter(isOnPromo)),
    [inCategory]
  );
  const anyPromo = useMemo(() => ranked.some(isOnPromo), [ranked]);

  // the "Promotions" page shows only promotions
  const pool = promoOnly ? promos : inCategory;

  // smart search: any word in the name, description, category or vendor
  const found = useMemo(
    () => (search ? searchProducts(pool, search, categories) : null),
    [search, pool, categories]
  );

  const shelves = useMemo(
    () => buildShelves(inCategory, categories, category),
    [inCategory, categories, category]
  );

  const handleSearch = (query) => {
    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;
    if (promoOnly) params.promo = "1";
    setSearchParams(params);
  };

  // shelves for browsing; a flat grid for searching or for a category with nothing inside it
  const showShelves =
    !search && !promoOnly && (!category || subCategories.length > 0);
  const waiting = loading || !categoriesReady;

  return (
    <section className="page products-page">
      <div className="page-header">
        <span className="eyebrow">MAK MART MARKETPLACE</span>

        <h1>{promoOnly ? "Promotions" : "Explore Products"}</h1>

        <p>
          {promoOnly
            ? "Limited-time deals from student vendors. The old price is crossed out."
            : "Discover products sold by student entrepreneurs."}
        </p>
      </div>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search MAK MART..."
      />

      <nav className="mm-catbar" aria-label="Categories">
        <Link
          to="/marketplace/products"
          className={!category && !promoOnly ? "is-active" : ""}
        >
          All
        </Link>
        {anyPromo && (
          <Link
            to="/marketplace/products?promo=1"
            className={`mm-catbar__promo ${promoOnly ? "is-active" : ""}`}
          >
            🔥 Promotions
          </Link>
        )}
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

      {search && found && (
        <div className="active-filter">
          {found.results.length === 0 ? (
            <>
              Nothing matched <strong>“{search}”</strong>. Try a shorter or
              different word.
            </>
          ) : found.partial ? (
            <>
              No product has every word in <strong>“{search}”</strong>. Showing
              the closest matches.
            </>
          ) : (
            <>
              {found.results.length}{" "}
              {found.results.length === 1 ? "result" : "results"} for{" "}
              <strong>“{search}”</strong>
            </>
          )}
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
          <>
            {promos.length > 0 && (
              <ProductRow
                variant="promo"
                eyebrow="Black November deals"
                title="🔥 Promotions"
                to="/marketplace/products?promo=1"
                products={promos.slice(0, ROW_LIMIT)}
              />
            )}
            {shelves.map((shelf) => (
            <ProductRow
              key={shelf.key}
              title={shelf.title}
              eyebrow={shelf.eyebrow}
              to={shelf.to}
              products={shelf.products.slice(0, ROW_LIMIT)}
            />
            ))}
          </>
        )
      ) : (
        <ProductGrid
          products={found ? found.results : pool}
          emptyTitle={promoOnly ? "No promotions right now" : undefined}
          emptyMessage={
            promoOnly ? "Check back soon. Vendors add new deals often." : undefined
          }
          loading={waiting}
          error={error}
        />
      )}
    </section>
  );
}

export default Products;