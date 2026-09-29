import ProductCard from "../marketplace/productcard";

function ProductSection({
  title = "Trending products",
  subtitle = "STUDENT BUSINESSES",
  products = [],
  loading = false,
}) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products available yet.</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;