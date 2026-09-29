import { useState } from "react";
import { MessageCircle } from "lucide-react";

import Modal from "../common/modal";
import ErrorMessage from "../common/ErrorMessage";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp, createCartOrderMessage } from "../../lib/whatsapp";
import OrderService from "../../services/order";

function CartCheckoutModal({
  vendor,
  items,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!vendor || !items?.length) return null;

  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLocation("");
    setNotes("");
    setError("");
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!customerPhone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    const vendorPhone = vendor.phone;

    if (!vendorPhone) {
      setError("This vendor has no contact number on file yet.");
      return;
    }

    setSubmitting(true);

    try {
      try {
        await OrderService.createMultiItemOrder({
          vendorId: vendor.id,
          items,
          totalAmount: total,
          customerLocation: customerLocation.trim(),
          notes: notes.trim(),
        });
      } catch (orderErr) {
        console.error("Order record not saved:", orderErr);
      }

      openWhatsApp(
        vendorPhone,
        createCartOrderMessage(items, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerLocation: customerLocation.trim(),
          notes: notes.trim(),
        })
      );

      onSuccess?.(vendor.id);
      handleClose();
    } catch (err) {
      setError(
        err.message || "Could not place order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Order from ${vendor.business_name}`}
    >
      <div className="order-modal__items">
        {items.map((item) => (
          <div className="order-modal__product" key={item.id}>
            {item.image_url && (
              <img src={item.image_url} alt={item.name} />
            )}

            <div>
              <strong>{item.name}</strong>
              <span>
                {item.quantity} x {formatCurrency(item.price)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError("")}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="order-modal__total">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <div className="form-group">
          <label htmlFor="cart-customer-name">Your name</label>
          <input
            id="cart-customer-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="e.g. Sarah Nakato"
          />
        </div>

        <div className="form-group">
          <label htmlFor="cart-customer-phone">Your phone number</label>
          <input
            id="cart-customer-phone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="e.g. 0771234567"
          />
        </div>

        <div className="form-group">
          <label htmlFor="cart-customer-location">
            Delivery / pickup location (optional)
          </label>
          <input
            id="cart-customer-location"
            value={customerLocation}
            onChange={(event) => setCustomerLocation(event.target.value)}
            placeholder="e.g. Lumumba Hall"
          />
        </div>

        <div className="form-group">
          <label htmlFor="cart-order-notes">Note to vendor (optional)</label>
          <textarea
            id="cart-order-notes"
            rows="3"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any special request..."
          />
        </div>

        <button
          type="submit"
          className="primary-button full-width"
          disabled={submitting}
        >
          <MessageCircle size={18} />
          {submitting ? "Placing order..." : "Place order via WhatsApp"}
        </button>
      </form>
    </Modal>
  );
}

export default CartCheckoutModal;