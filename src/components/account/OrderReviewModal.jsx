import { useState } from "react";
import Modal from "../common/modal";
import { StarInput } from "../common/Stars";
import RatingService from "../../services/ratingService";
import { invalidateRatings } from "../../hooks/useRatings";

// Shown after the buyer confirms delivery. The comment goes to the
// MAK MART administration; the star numbers are public.
function OrderReviewModal({ order, onClose, onDone }) {
  const [vendorRating, setVendorRating] = useState(0);
  const [productRatings, setProductRatings] = useState({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = (order?.order_items || []).filter((item) => item.product_id);
  const vendorName = order?.vendors?.business_name || "the vendor";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!vendorRating) {
      setError(`Please rate ${vendorName} (tap the stars).`);
      return;
    }

    setSubmitting(true);
    try {
      await RatingService.submitReview({
        orderId: order.id,
        vendorRating,
        comment: comment.trim(),
        productRatings: Object.entries(productRatings)
          .filter(([, rating]) => rating > 0)
          .map(([productId, rating]) => ({ productId, rating })),
      });
      invalidateRatings();
      onDone?.();
    } catch (err) {
      setError(err.message || "Could not save your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(order)} onClose={onClose} title="Rate your order">
      <form className="mm-review" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="mm-review__block">
          <strong>How was {vendorName}?</strong>
          <StarInput value={vendorRating} onChange={setVendorRating} label={`Rate ${vendorName}`} />
        </div>

        {items.length > 0 && (
          <div className="mm-review__block">
            <strong>Rate what you bought <small>(optional)</small></strong>
            {items.map((item) => (
              <div key={item.product_id} className="mm-review__product">
                <span>{item.product_name}</span>
                <StarInput
                  size={24}
                  value={productRatings[item.product_id] || 0}
                  onChange={(rating) =>
                    setProductRatings((prev) => ({ ...prev, [item.product_id]: rating }))
                  }
                  label={`Rate ${item.product_name}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="review-comment">Comment for the MAK MART team <small>(optional)</small></label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Was it as described? Was delivery on time? Anything we should know?"
          />
          <p className="field-hint">
            Only the star ratings are shown publicly. Your comment is read by the administration.
          </p>
        </div>

        <button className="mm-btn mm-btn--primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Submit review"}
        </button>
      </form>
    </Modal>
  );
}

export default OrderReviewModal;