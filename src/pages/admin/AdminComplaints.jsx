import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ReportService, { REPORT_REASONS } from "../../services/reportService";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Action taken" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));
const TYPE_LABEL = { product: "Product", service: "Service", vendor: "Shop", provider: "Provider" };

function targetLink(report) {
  switch (report.target_type) {
    case "product":
      return `/marketplace/products/${report.target_id}`;
    case "service":
      return `/services/${report.target_id}`;
    case "vendor":
      return `/marketplace/vendors/${report.target_id}`;
    case "provider":
      return `/providers/${report.target_id}`;
    default:
      return null;
  }
}

function AdminComplaints() {
  const [filter, setFilter] = useState("open");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let off = false;
    ReportService.list(filter)
      .then((rows) => {
        if (off) return;
        setReports(rows);
        setError("");
      })
      .catch((err) => {
        if (!off) setError(err.message || "Could not load reports.");
      })
      .finally(() => {
        if (!off) setLoading(false);
      });
    return () => {
      off = true;
    };
  }, [filter, tick]);

  const decide = async (report, status) => {
    setBusyId(report.id);
    setError("");
    try {
      await ReportService.resolve(report.id, status, notes[report.id]);
      setTick((n) => n + 1);
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
          <h1>Complaints</h1>
          <p>
            Buyers can report products, services, shops and providers. Check the listing, take action in
            Products, Services or Vendors if needed, then close the report. The buyer gets a thank-you.
          </p>
        </div>
      </div>

      <div className="insights-periods" role="group" aria-label="Filter reports">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === filter ? "is-active" : ""}
            onClick={() => {
              setLoading(true);
              setFilter(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here</h3>
          <p>No reports in this list. That is good news.</p>
        </div>
      ) : (
        <ul className="review-list">
          {reports.map((report) => {
            const link = targetLink(report);
            return (
              <li key={report.id} className={`review-item review-item--${report.status === "open" ? "pending" : report.status === "resolved" ? "approved" : "rejected"}`}>
                <div className="review-item__head">
                  <strong>
                    {TYPE_LABEL[report.target_type] || "Listing"}: {report.target_label || "Unnamed"}
                  </strong>
                  <em>{REASON_LABEL[report.reason] || report.reason}</em>
                </div>

                <small>
                  Reported by {report.profiles?.full_name || "a buyer"} · {new Date(report.created_at).toLocaleString()}
                  {report.status !== "open" ? ` · ${report.status}` : ""}
                </small>

                {report.details ? <p>{report.details}</p> : <p className="field-hint">No extra details.</p>}
                {report.admin_note && <small>Note: {report.admin_note}</small>}

                {link && (
                  <p>
                    <Link to={link} target="_blank" rel="noreferrer">View the listing</Link>
                  </p>
                )}

                <div className="review-item__actions">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={notes[report.id] ?? ""}
                    onChange={(event) => setNotes((prev) => ({ ...prev, [report.id]: event.target.value }))}
                    aria-label="Admin note"
                  />
                  {report.status === "open" ? (
                    <>
                      <button type="button" className="primary-button" disabled={busyId === report.id} onClick={() => decide(report, "resolved")}>
                        Action taken
                      </button>
                      <button type="button" className="secondary-button" disabled={busyId === report.id} onClick={() => decide(report, "dismissed")}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <button type="button" className="secondary-button" disabled={busyId === report.id} onClick={() => decide(report, "open")}>
                      Reopen
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AdminComplaints;