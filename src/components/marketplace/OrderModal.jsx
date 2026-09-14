import { useState } from "react";
import { Minus, Plus, MessageCircle } from "lucide-react";

import Modal from "../common/modal";
import ErrorMessage from "../common/ErrorMessage";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp, createProductOrderMessage } from "../../lib/whatsapp";
import OrderService from "../../services/order";

function OrderModal({ product, isOpen, onClose }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!product) return null;

  const vendor = product.vendor || product.vendors;
  const price = Number(product.price || 0);
  const total = price * quantity;

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLocation("");
    setNotes("");
    setQuantity(1);
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

    const vendorPhone = vendor?.phone;

    if (!vendorPhone) {
      setError("This vendor has no contact number on file yet.");
      return;
    }

    setSubmitting(true);

    try {
      // Saves a real order record if the shopper is signed in
      // and the write succeeds. Either way, the WhatsApp
      // message still goes out below - ordering never blocks
      // on having an account or on a database hiccup.
      try {
        await OrderService.createOrder({
          product_id: product.id,
          product_name: product.name,
          vendor_id: vendor.id,
          customer_location: customerLocation.trim(),
          quantity,
          unit_price: price,
          total_amount: total,
          notes: notes.trim(),
        });
      } catch (orderErr) {
        console.error("Order record not saved:", orderErr);
      }

      openWhatsApp(
        vendorPhone,
        createProductOrderMessage(product, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerLocation: customerLocation.trim(),
          quantity,
          notes: notes.trim(),
        })
      );


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
      title="Order this product"
    >
      <div className="order-modal__product">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} />
        )}

        <div>
          <strong>{product.name}</strong>
          <span>{formatCurrency(price)} each</span>
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError("")}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="order-quantity">Quantity</label>

          <div className="quantity-stepper">
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => Math.max(1, q - 1))
              }
            >
              <Minus size={15} />
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="order-modal__total">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <div className="form-group">
          <label htmlFor="customer-name">Your name</label>
          <input
            id="customer-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="e.g. Sarah Nakato"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customer-phone">Your phone number</label>
          <input
            id="customer-phone"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="e.g. 0771234567"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customer-location">
            Delivery / pickup location (optional)
          </label>
          <input
            id="customer-location"
            value={customerLocation}
            onChange={(event) => setCustomerLocation(event.target.value)}
            placeholder="e.g. Lumumba Hall"
          />
        </div>

        <div className="form-group">
          <label htmlFor="order-notes">Note to vendor (optional)</label>
          <textarea
            id="order-notes"
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

export default OrderModal;
