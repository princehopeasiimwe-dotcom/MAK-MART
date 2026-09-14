import { Link } from "react-router-dom";
import { ShoppingCart, Store } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { useCart } from "../../context/CartContext";

function ProductCard({ product }) {
  const { addToCart } = useCart();

  const image =
    product?.image_url ||
    product?.image ||
    "https://placehold.co/600x600?text=KU+Market";

  const vendorName =
    product?.vendors?.business_name ||
    product?.vendor_name ||
    "KU Market Vendor";

  const productId = product?.id;

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    addToCart(product);
  };

  return (
    <article className="product-card">
      <Link
        to={productId ? `/marketplace/products/${productId}` : "/marketplace/products"}
        className="product-card-image-link"
      >
        <div className="product-card-image">
          <img
            src={image}
            alt={product?.name || "Product"}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src =
                "https://placehold.co/600x600?text=KU+Market";
            }}
          />

          {product?.categories?.name && (
            <span className="product-category-badge">
              {product.categories.name}
            </span>
          )}

          {product?.is_available === false && (
            <span className="product-status-badge">
              Unavailable
            </span>
          )}
        </div>
      </Link>

      <div className="product-card-content">
        <Link
          to={productId ? `/marketplace/products/${productId}` : "/marketplace/products"}
          className="product-card-title-link"
        >
          <h3>{product?.name || "Unnamed Product"}</h3>
        </Link>

        <p className="product-price">
          {formatCurrency(product?.price || 0)}
        </p>

        <div className="product-vendor">
          <Store size={15} />
          <span>{vendorName}</span>
        </div>

        <div className="product-card-actions">
          <Link
            to={productId ? `/marketplace/products/${productId}` : "/marketplace/products"}
            className="product-view-button"
          >
            View
          </Link>

          <button
            type="button"
            className="product-cart-button"
            onClick={handleAddToCart}
            title="Add to cart"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;