import ProductCard from "./productcard";
import Loader from "../common/loader";
import EmptyState from "../common/EmptyState";

function ProductGrid({
  products = [],
  loading = false,
  error = null,
  emptyTitle = "No products found",
  emptyMessage = "There are no products matching your search right now.",
}) {
  if (loading) {
    return <Loader text="Loading products..." />;
  }

  if (error) {
    return (
      <div className="marketplace-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}

export default ProductGrid;