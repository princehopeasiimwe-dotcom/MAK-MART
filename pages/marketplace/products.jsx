import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useProducts from "../../hooks/useProducts";
import ProductService from "../../services/ProductService";
import ProductGrid from "../../components/marketplace/productGrid";
import SearchBar from "../../components/marketplace/SearchBar";

function Products() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const search =
    searchParams.get("search") || "";

  const category =
    searchParams.get("category") || null;

  const [categoryName, setCategoryName] = useState("");

  const {
    products,
    loading,
    error,
  } = useProducts({
    search,
    category,
  });

  useEffect(() => {
    if (!category) {
      setCategoryName("");
      return;
    }

    ProductService.getCategories()
      .then((categories) => {
        const match = categories.find(
          (item) => item.id === category
        );
        setCategoryName(match?.name || "");
      })
      .catch(() => setCategoryName(""));
  }, [category]);

  const handleSearch = (query) => {
    const params = {};

    if (query) {
      params.search = query;
    }

    if (category) {
      params.category = category;
    }

    setSearchParams(params);
  };

  return (
    <section className="page products-page">
      <div className="page-header">
        <span className="eyebrow">
          KU MARKETPLACE
        </span>

        <h1>Explore Products</h1>

        <p>
          Discover products sold by student
          entrepreneurs.
        </p>
      </div>

      <SearchBar
        initialValue={search}
        onSearch={handleSearch}
        placeholder="Search KU Market..."
      />

      {category && (
        <div className="active-filter">
          Showing category: <strong>{categoryName || "..."}</strong>
        </div>
      )}

      <ProductGrid
        products={products}
        loading={loading}
        error={error}
      />
    </section>
  );
}

export default Products;