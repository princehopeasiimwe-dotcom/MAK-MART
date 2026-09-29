import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle } from "lucide-react";

import { useCart } from "../../context/CartContext";
import EmptyState from "../../components/common/EmptyState";
import CartCheckoutModal from "../../components/marketplace/CartCheckoutModal";
import { formatCurrency } from "../../utils/currency";

function Cart() {
  const {
    items,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const [checkoutVendorId, setCheckoutVendorId] = useState(null);

  const vendorGroups = useMemo(() => {
    const groups = {};

    items.forEach((item) => {
      const vendor = item.vendors || item.vendor;
      const vendorId = vendor?.id || "unknown";

      if (!groups[vendorId]) {
        groups[vendorId] = { vendor, items: [] };
      }

      groups[vendorId].items.push(item);
    });

    return Object.values(groups);
  }, [items]);

  const activeGroup = vendorGroups.find(
    (group) => group.vendor?.id === checkoutVendorId
  );

  if (!items.length) {
    return (
      <section className="page">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Browse the marketplace and add products you'd like to order."
          actionLabel="Browse products"
          onAction={() => {
            window.location.href = "/marketplace/products";
          }}
        />
      </section>
    );
  }

  return (
    <section className="page cart-page">
      <div className="page-header">
        <span className="eyebrow">YOUR CART</span>
        <h1>Cart</h1>
        <p>Review your items before ordering. Each vendor is checked out separately.</p>
      </div>

      {vendorGroups.map((group) => {
        const subtotal = group.items.reduce(
          (sum, item) => sum + Number(item.price || 0) * item.quantity,
          0
        );

        return (
          <div className="cart-vendor-group" key={group.vendor?.id || "unknown"}>
            <div className="cart-vendor-group__header">
              <h3>{group.vendor?.business_name || "Unknown vendor"}</h3>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {group.items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item__image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <ShoppingBag size={22} />
                  )}
                </div>

                <div className="cart-item__info">
                  <Link to={`/marketplace/products/${item.id}`}>
                    {item.name}
                  </Link>
                  <span>{formatCurrency(item.price)}</span>
                </div>

                <div className="quantity-stepper">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, Math.max(1, item.quantity - 1))
                    }
                  >
                    <Minus size={14} />
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  className="cart-item__remove"
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="primary-button"
              disabled={!group.vendor?.id}
              onClick={() => setCheckoutVendorId(group.vendor?.id)}
            >
              <MessageCircle size={17} />
              Order from {group.vendor?.business_name || "this vendor"}
            </button>
          </div>
        );
      })}

      <CartCheckoutModal
        vendor={activeGroup?.vendor}
        items={activeGroup?.items || []}
        isOpen={Boolean(activeGroup)}
        onClose={() => setCheckoutVendorId(null)}
        onSuccess={(vendorId) => {
          const group = vendorGroups.find(
            (item) => item.vendor?.id === vendorId
          );
          group?.items.forEach((item) => removeFromCart(item.id));
        }}
      />
    </section>
  );
}

export default Cart;