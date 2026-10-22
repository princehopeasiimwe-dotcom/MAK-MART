import { useState } from "react";
import Modal from "../common/modal";
import { StarInput } from "../common/Stars";
import RatingService from "../../services/ratingService";
import { invalidateRatings } from "../../hooks/useRatings";

function ServiceReviewModal({ request, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const provider = request?.service_providers?.business_name || "the provider";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!rating) {
      setError(`Please rate ${provider} (tap the stars).`);
      return;
    }
    setSubmitting(true);
    try {
      await RatingService.submitServiceReview({ requestId: request.id, rating, comment: comment.trim() });
      invalidateRatings();
      onDone?.();
    } catch (err) {
      setError(err.message || "Could not save your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(request)} onClose={onClose} title="Rate this service">
      <form className="mm-review" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="mm-review__block">
          <strong>How was “{request?.service_name}” by {provider}?</strong>
          <StarInput value={rating} onChange={setRating} label={`Rate ${provider}`} />
        </div>

        <div className="form-group">
          <label htmlFor="svc-review-comment">Comment for the MAK MART team <small>(optional)</small></label>
          <textarea
            id="svc-review-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Was the work good? Was it on time? Anything we should know?"
          />
          <p className="field-hint">
            Only the star rating is shown publicly. Your comment is read by the administration.
          </p>
        </div>

        <button className="mm-btn mm-btn--primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Submit review"}
        </button>
      </form>
    </Modal>
  );
}

export default ServiceReviewModal;