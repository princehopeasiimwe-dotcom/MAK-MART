import { useEffect, useState } from "react";
import { Eye, Users, ShoppingCart, PackageCheck, Star } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { StarRating } from "../../components/common/Stars";
import RatingService from "../../services/ratingService";
import usePageSeo from "../../hooks/usePageSeo";

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function formatDay(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function VendorInsights() {
  usePageSeo({ title: "Insights", noindex: true });

  const { vendor } = useAuth();
  const vendorId = vendor?.id;

  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return undefined;

    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      // Close off any finished days first (a no-op if already done).
      await supabase.rpc("generate_missing_reports").then(() => {}, () => {});

      const { data: insights, error: insightsError } = await supabase.rpc("vendor_insights", {
        p_days: days,
      });
      if (insightsError) throw insightsError;
      if (active) setData(insights);
    }

    load()
      .catch((err) => {
        if (active) {
          setError(
            /function|does not exist|schema cache/i.test(err.message || "")
              ? "Insights aren't switched on yet. The site admin needs to run the latest database update."
              : err.message || "Could not load insights."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [vendorId, days]);

  useEffect(() => {
    if (!vendorId) return undefined;
    let active = true;

    RatingService.getVendorStats()
      .then((rows) => {
        if (active) setRating(rows.find((row) => row.vendor_id === vendorId) || null);
      })
      .catch(() => {});

    supabase
      .from("order_reviews")
      .select("id, vendor_rating, comment, created_at")
      .eq("vendor_id", vendorId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data: rows }) => {
        if (active) setReviews(rows || []);
      });

    return () => {
      active = false;
    };
  }, [vendorId]);

  const daily = data?.daily || [];
  const maxViews = Math.max(1, ...daily.map((d) => d.views));
  const top = data?.top_products || [];
  const maxTop = Math.max(1, ...top.map((p) => p.viewers));

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <span className="eyebrow">INSIGHTS</span>
        <h1>Who is looking at your products</h1>
        <p>
          Counts are people who opened one of your product pages. Each person is
          counted once per product per day.
        </p>
      </div>

      <div className="insights-periods" role="group" aria-label="Time period">
        {PERIODS.map((period) => (
          <button
            key={period.days}
            type="button"
            className={period.days === days ? "is-active" : ""}
            onClick={() => setDays(period.days)}
          >
            {period.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && !data && <p>Loading insights...</p>}

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <Users size={24} />
              <span>People today</span>
              <strong>{data.today_viewers}</strong>
            </div>
            <div className="stat-card">
              <Eye size={24} />
              <span>People, last {days} days</span>
              <strong>{data.period_viewers}</strong>
            </div>
            <div className="stat-card">
              <ShoppingCart size={24} />
              <span>Orders in app</span>
              <strong>{data.period_orders}</strong>
            </div>
            <div className="stat-card">
              <PackageCheck size={24} />
              <span>Delivered (confirmed)</span>
              <strong>{data.period_delivered}</strong>
            </div>
          </div>

          <div className="insights-card">
            <h2>Daily viewers</h2>
            {daily.every((d) => d.views === 0) ? (
              <p className="field-hint">No product views in this period yet.</p>
            ) : (
              <div className="insights-bars" role="img" aria-label="Bar chart of product views per day">
                {daily.map((d) => (
                  <div key={d.day} className="insights-bars__col" title={`${formatDay(d.day)}: ${d.viewers} people, ${d.views} views`}>
                    <span style={{ height: `${Math.max(4, (d.views / maxViews) * 100)}%` }} />
                    {daily.length <= 14 && <small>{formatDay(d.day)}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="insights-card">
            <h2>Most viewed products</h2>
            {top.length === 0 ? (
              <p className="field-hint">Nothing viewed yet. Good photos and clear prices help.</p>
            ) : (
              <ul className="insights-top">
                {top.map((product) => (
                  <li key={product.product_id}>
                    <span>{product.name}</span>
                    <div><i style={{ width: `${(product.viewers / maxTop) * 100}%` }} /></div>
                    <strong>{product.viewers}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="insights-card">
        <h2><Star size={20} /> Your rating</h2>
        {rating?.rating_count ? (
          <p>
            <StarRating value={rating.rating_avg} count={rating.rating_count} size={20} />{" "}
            from buyers who confirmed delivery. Higher-rated vendors are shown first in the marketplace.
          </p>
        ) : (
          <p className="field-hint">
            No ratings yet. After a buyer confirms delivery in the app they can rate you. Higher-rated
            vendors are shown first in the marketplace.
          </p>
        )}

        {reviews.length > 0 && (
          <ul className="insights-reviews">
            {reviews.map((review) => (
              <li key={review.id}>
                <strong>{"★".repeat(review.vendor_rating)}{"☆".repeat(5 - review.vendor_rating)}</strong>
                {review.comment && <p>{review.comment}</p>}
                <small>{new Date(review.created_at).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default VendorInsights;