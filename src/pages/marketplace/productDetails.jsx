import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Store,
  ShoppingCart,
} from "lucide-react";

import useProducts from "../../hooks/useProducts";
import { useCart } from "../../context/CartContext";
import Loader from "../../components/common/loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import OrderModal from "../../components/marketplace/OrderModal";
import { formatCurrency } from "../../utils/currency";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { getProduct, loading, error } =
    useProducts({ autoLoad: false });

  const { addToCart } = useCart();

  const [product, setProduct] =
    useState(null);

  const [orderModalOpen, setOrderModalOpen] =
    useState(false);

  useEffect(() => {
    getProduct(id).then(setProduct);
  }, [id]);

  if (loading) {
    return <Loader message="Loading product..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
      />
    );
  }

  if (!product) {
    return null;
  }

  const image =
    product.image_url ||
    product.images?.[0] ||
    product.images?.[0]?.url;

  const vendor =
    product.vendor ||
    product.vendors;

  const vendorName =
    vendor?.business_name ||
    product.vendor_name ||
    "KU Market Vendor";

  return (
    <section className="page product-details-page">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="product-details">
        <div className="product-details__image">
          {image ? (
            <img
              src={image}
              alt={product.name}
            />
          ) : (
            <div className="image-placeholder">
              No image available
            </div>
          )}
        </div>

        <div className="product-details__content">
          <span className="eyebrow">
            {product.categories?.name || "MARKETPLACE"}
          </span>

          <h1>{product.name}</h1>

          <h2>
            {formatCurrency(product.price || 0)}
          </h2>

          <p>
            {product.description ||
              "No description provided."}
          </p>

          <div className="seller-box">
            <Store size={22} />

            <div>
              <small>SOLD BY</small>
              <strong>{vendorName}</strong>
            </div>
          </div>

          <div className="product-details__actions">
            <button
              className="primary-button"
              onClick={() => setOrderModalOpen(true)}
            >
              <MessageCircle size={18} />
              Order on WhatsApp
            </button>

            <button
              className="secondary-button"
              onClick={() => addToCart(product)}
            >
              <ShoppingCart size={18} />
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <OrderModal
        product={product}
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
      />
    </section>
  );
}

export default ProductDetails;