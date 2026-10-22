import { useCallback, useEffect, useState } from "react";
import { Check, X, MessageCircle } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import RatingService from "../../services/ratingService";
import { formatCurrency } from "../../utils/currency";
import usePageSeo from "../../hooks/usePageSeo";

const LABELS = {
  pending: "Waiting",
  accepted: "Accepted",
  completed: "Done (confirmed)",
  cancelled: "Cancelled",
};

function ProviderRequests() {
  usePageSeo({ title: "Service requests", noindex: true });

  const { serviceProvider } = useAuth();
  const providerId = serviceProvider?.id;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("service_requests")
      .select("id, service_name, quoted_price, notes, location, status, created_at, delivery_confirmed_at, profiles:buyer_id ( full_name, phone )")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (loadError) setError(loadError.message);
    else setRequests(data || []);
    setLoading(false);
  }, [providerId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (request, status) => {
    setBusyId(request.id);
    setError("");
    try {
      await RatingService.setRequestStatus(request.id, status);
      await load();
    } catch (err) {
      setError(err.message || "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <span className="eyebrow">SERVICE PROVIDER</span>
        <h1>Service requests</h1>
        <p>
          People who asked for your services. They'll also message you on WhatsApp. When the job is done,
          the customer confirms it in the app and can rate you.
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <h3>No requests yet</h3>
          <p>When someone requests one of your services, it shows up here.</p>
        </div>
      ) : (
        <ul className="review-list">
          {requests.map((request) => (
            <li key={request.id} className={`review-item review-item--${request.status === "completed" ? "approved" : request.status === "cancelled" ? "rejected" : "pending"}`}>
              <div className="review-item__head">
                <strong>{request.service_name}</strong>
                {request.quoted_price != null && <span>{formatCurrency(request.quoted_price)}</span>}
                <em>{LABELS[request.status]}</em>
              </div>
              <small>
                {request.profiles?.full_name || "Customer"}
                {request.profiles?.phone ? ` · ${request.profiles.phone}` : ""} ·{" "}
                {new Date(request.created_at).toLocaleString()}
              </small>
              {request.location && <small>Where: {request.location}</small>}
              {request.notes && <p>{request.notes}</p>}

              {(request.status === "pending" || request.status === "accepted") && (
                <div className="review-item__actions">
                  {request.status === "pending" && (
                    <button type="button" className="primary-button" disabled={busyId === request.id} onClick={() => setStatus(request, "accepted")}>
                      <Check size={16} /> Accept
                    </button>
                  )}
                  <button type="button" className="secondary-button" disabled={busyId === request.id} onClick={() => setStatus(request, "cancelled")}>
                    <X size={16} /> Decline
                  </button>
                  {request.profiles?.phone && (
                    <a
                      className="secondary-button"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/${String(request.profiles.phone).replace(/\D/g, "").replace(/^0/, "256")}`}
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ProviderRequests;