import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Heart, MapPin, ShoppingBag, Store } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { useCart } from "../../context/CartContext";
import useWishlist from "../../hooks/useWishlist";
import useRatings from "../../hooks/useRatings";
import { StarRating } from "../common/Stars";

function isNew(dateString) {
  if (!dateString) return false;
  const age = Date.now() - new Date(dateString).getTime();
  return age >= 0 && age < 7 * 24 * 60 * 60 * 1000;
}

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { has, toggle } = useWishlist();
  const { productStats, vendorStats } = useRatings();
  const [imageFailed, setImageFailed] = useState(false);
  const [added, setAdded] = useState(false);

  const productId = product?.id;
  const link = productId
    ? `/marketplace/products/${productId}`
    : "/marketplace/products";

  const image = product?.image_url || product?.image || "";
  const vendor = product?.vendors || product?.vendor;
  const vendorName =
    vendor?.business_name || product?.vendor_name || "MAK MART Vendor";
  const location = product?.location || vendor?.location;
  const categoryName = product?.categories?.name;

  const stock = product?.stock_quantity;
  const soldOut = product?.is_available === false || stock === 0;
  const lowStock = !soldOut && typeof stock === "number" && stock <= 5;

  const badge = soldOut
    ? "Sold out"
    : product?.is_featured
    ? (
        <>
          <span className="mm-card__badge-extra">Student </span>favourite
        </>
      )
    : isNew(product?.created_at)
    ? "New"
    : null;

  const saved = productId ? has(productId) : false;

  const handleAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const handleSave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (productId) toggle(productId);
  };

  return (
    <article className="mm-card">
      <div className="mm-card__media">
        <Link to={link} className="mm-card__imagelink" aria-label={product?.name}>
          {image && !imageFailed ? (
            <img
              src={image}
              alt={product?.name || "Product"}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="mm-card__noimage" aria-hidden="true">
              <ShoppingBag size={34} />
            </span>
          )}
        </Link>

        {badge && <span className="mm-card__badge">{badge}</span>}

        <button
          type="button"
          className={`mm-card__heart ${saved ? "is-saved" : ""}`}
          onClick={handleSave}
          aria-label={saved ? "Remove from saved" : "Save this item"}
          aria-pressed={saved}
        >
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>

        {!soldOut && (
          <button
            type="button"
            className="mm-card__cart"
            onClick={handleAdd}
            aria-label="Add to cart"
          >
            {added ? "Added" : <ShoppingBag size={18} />}
          </button>
        )}
      </div>

      <div className="mm-card__body">
        <div className="mm-card__meta">
          <span>{categoryName || "Marketplace"}</span>
        </div>

        <Link to={link} className="mm-card__title">
          <h3>{product?.name || "Unnamed product"}</h3>
        </Link>

        <StarRating
          value={productStats.get(productId)?.rating_avg ?? vendorStats.get(product?.vendor_id)?.rating_avg}
          count={productStats.get(productId)?.rating_count ?? vendorStats.get(product?.vendor_id)?.rating_count}
          size={14}
        />

        <p className="mm-card__price">{formatCurrency(product?.price || 0)}</p>

        <p className="mm-card__vendor">
          <Store size={16} aria-hidden="true" />
          <span>{vendorName}</span>
          {vendor?.is_verified && (
            <BadgeCheck size={16} className="mm-card__verified" aria-label="Verified vendor" />
          )}
        </p>

        <div className="mm-card__foot">
          <span className="mm-card__where">
            <MapPin size={15} aria-hidden="true" />
            {location || "Makerere"}
          </span>
          <span
            className={`mm-card__stock ${
              soldOut ? "is-out" : lowStock ? "is-low" : ""
            }`}
          >
            {soldOut ? "Out of stock" : lowStock ? `Only ${stock} left` : "In stock"}
          </span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;