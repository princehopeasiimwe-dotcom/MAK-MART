import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ProductCard from "../marketplace/productcard";

function ProductSection({
  title = "Campus favourites",
  subtitle = "TRENDING ON MAK MART",
  products = [],
  loading = false,
  viewAllTo = "/marketplace/products",
}) {
  return (
    <section className="mm-section mm-container">
      <div className="mm-section__head">
        <div>
          <span className="mm-eyebrow">{subtitle}</span>
          <h2>{title}</h2>
        </div>

        {viewAllTo && (
          <Link to={viewAllTo} className="mm-viewall">
            View all <ArrowRight size={18} />
          </Link>
        )}
      </div>

      {loading ? (
        <p className="mm-empty">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="mm-empty">No products available yet.</p>
      ) : (
        <div className="mm-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;