import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import RatingService from "../../services/ratingService";
import { invalidateRatings } from "../../hooks/useRatings";

const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function Stars({ n }) {
  return <span aria-label={`${n} out of 5`}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

function AdminReviews() {
  const [filter, setFilter] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReviews(await RatingService.getReviews(filter));
    } catch (err) {
      setError(err.message || "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (review, status) => {
    setBusyId(review.id);
    setError("");
    try {
      await RatingService.moderate(review.id, status, notes[review.id]);
      invalidateRatings();
      await load();
    } catch (err) {
      setError(err.message || "Could not save that decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Buyer reviews</h1>
          <p>
            Buyers rate vendors after confirming delivery. Approved ratings count toward each
            vendor's stars and ranking. Comments are only ever seen here, and by the vendor once approved.
          </p>
        </div>
      </div>

      <div className="insights-periods" role="group" aria-label="Filter reviews">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === filter ? "is-active" : ""}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here</h3>
          <p>New reviews show up as buyers confirm their deliveries.</p>
        </div>
      ) : (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id} className={`review-item review-item--${review.status}`}>
              <div className="review-item__head">
                <strong>{review.vendors?.business_name || "Vendor"}</strong>
                <span className="review-item__stars"><Stars n={review.vendor_rating} /></span>
                <em>{review.status}</em>
              </div>

              <small>
                {review.profiles?.full_name || "Buyer"} · {new Date(review.created_at).toLocaleString()}
              </small>

              {review.comment ? <p>{review.comment}</p> : <p className="field-hint">No comment.</p>}

              {review.order_product_ratings?.length > 0 && (
                <ul className="review-item__products">
                  {review.order_product_ratings.map((row, index) => (
                    <li key={index}>
                      {row.products?.name || "Product"} <Stars n={row.rating} />
                    </li>
                  ))}
                </ul>
              )}

              {review.admin_note && <small>Note: {review.admin_note}</small>}

              <div className="review-item__actions">
                <input
                  type="text"
                  placeholder="Optional note"
                  value={notes[review.id] ?? ""}
                  onChange={(event) =>
                    setNotes((prev) => ({ ...prev, [review.id]: event.target.value }))
                  }
                />
                {review.status !== "approved" && (
                  <button type="button" className="primary-button" disabled={busyId === review.id} onClick={() => decide(review, "approved")}>
                    <Check size={16} /> Approve
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button type="button" className="secondary-button" disabled={busyId === review.id} onClick={() => decide(review, "rejected")}>
                    <X size={16} /> Reject
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminReviews;