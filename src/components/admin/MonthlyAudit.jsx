import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

function thisMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  // Leading = + - @ can run as a formula in Excel; neutralise them.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildCsv(month, audit, svc) {
  const lines = [
    ["MAK MART monthly audit", month],
    [],
    ["Visitors (unique people)", audit.visitors],
    ["People who viewed a product", audit.product_viewers],
    ["Product views", audit.product_views],
    ["Orders placed in app", audit.orders_placed],
    ["Orders cancelled", audit.orders_cancelled],
    ["Orders confirmed delivered by buyer", audit.orders_delivered],
    ["Delivered value (UGX)", audit.delivered_value],
    ["Reviews received", audit.reviews],
    ["Average vendor rating (approved)", audit.avg_vendor_rating ?? ""],
    [],
    ["Vendor", "People who viewed", "Product views", "Orders", "Delivered"],
    ...(audit.vendors || []).map((v) => [v.business_name, v.viewers, v.views, v.orders, v.delivered]),
    [],
    ["Day", "Visitors", "Product views", "Orders"],
    ...(audit.daily || []).map((d) => [d.day, d.visitors, d.views, d.orders]),
    ...(svc
      ? [
          [],
          ["SERVICES"],
          ["People who viewed a service", svc.service_viewers],
          ["Service views", svc.service_views],
          ["Requests placed in app", svc.requests_placed],
          ["Requests cancelled", svc.requests_cancelled],
          ["Requests confirmed done by customer", svc.requests_completed],
          ["Completed value (UGX)", svc.completed_value],
          ["Service reviews", svc.reviews],
          ["Average service rating (approved)", svc.avg_rating ?? ""],
          [],
          ["Provider", "People who viewed", "Views", "Requests", "Completed"],
          ...(svc.providers || []).map((p) => [p.business_name, p.viewers, p.views, p.requests, p.completed]),
        ]
      : []),
  ];
  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

function pct(part, whole) {
  if (!whole) return "–";
  return `${Math.round((part / whole) * 100)}%`;
}

function MonthlyAudit() {
  const [month, setMonth] = useState(thisMonth());
  const [audit, setAudit] = useState(null);
  const [svc, setSvc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      // Close off finished days (stores the daily reports), then read the month.
      await supabase.rpc("generate_missing_reports").then(() => {}, () => {});
      const { data, error: rpcError } = await supabase.rpc("admin_monthly_audit", {
        p_month: `${month}-01`,
      });
      if (rpcError) throw rpcError;
      // Services audit is optional: it only exists once migration 020 has been run.
      const { data: svcData } = await supabase.rpc("admin_monthly_service_audit", {
        p_month: `${month}-01`,
      });
      if (active) {
        setAudit(data);
        setSvc(svcData || null);
      }
    }

    load()
      .catch((err) => {
        if (active) {
          setError(
            /function|does not exist|schema cache/i.test(err.message || "")
              ? "The audit isn't switched on yet. Run the latest database updates (017 and 018) in Supabase."
              : err.message || "Could not load the audit."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month]);

  const download = () => {
    const blob = new Blob([buildCsv(month, audit, svc)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `makmart-audit-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audit">
      <div className="audit__head">
        <div>
          <h2>Monthly audit</h2>
          <p className="field-hint">
            Visitors are counted anonymously. “Delivered” means the buyer came back to the app and
            confirmed they received the order.
          </p>
        </div>

        <div className="audit__tools">
          <input
            type="month"
            value={month}
            max={thisMonth()}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
            aria-label="Month"
          />
          <button type="button" className="secondary-button" onClick={download} disabled={!audit}>
            <Download size={16} /> Download CSV
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && !audit && <p>Loading audit...</p>}

      {audit && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><span>Visitors</span><strong>{audit.visitors}</strong></div>
            <div className="stat-card"><span>Viewed a product</span><strong>{audit.product_viewers}</strong></div>
            <div className="stat-card"><span>Orders placed</span><strong>{audit.orders_placed}</strong></div>
            <div className="stat-card"><span>Confirmed delivered</span><strong>{audit.orders_delivered}</strong></div>
          </div>

          <p className="audit__funnel">
            Of {audit.visitors} visitors, {audit.product_viewers} looked at a product ({pct(audit.product_viewers, audit.visitors)}),
            {" "}{audit.orders_placed} orders were placed in the app, and {audit.orders_delivered} were confirmed delivered
            ({formatCurrency(audit.delivered_value)}).
            {audit.avg_vendor_rating ? ` Average vendor rating this month: ${audit.avg_vendor_rating}★ from ${audit.reviews} reviews.` : ""}
          </p>
          <p className="field-hint">
            Only orders placed while signed in are recorded in the app. Guests who go straight to WhatsApp are
            counted as visitors and viewers, but can’t be confirmed as bought.
          </p>

          {audit.vendors?.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>People who viewed</th>
                  <th>Views</th>
                  <th>Orders</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {audit.vendors.map((v) => (
                  <tr key={v.vendor_id}>
                    <td>{v.business_name}</td>
                    <td>{v.viewers}</td>
                    <td>{v.views}</td>
                    <td>{v.orders}</td>
                    <td>{v.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {svc && (
            <>
              <h3 className="audit__subhead">Services</h3>
              <div className="stats-grid">
                <div className="stat-card"><span>Viewed a service</span><strong>{svc.service_viewers}</strong></div>
                <div className="stat-card"><span>Requests placed</span><strong>{svc.requests_placed}</strong></div>
                <div className="stat-card"><span>Confirmed done</span><strong>{svc.requests_completed}</strong></div>
                <div className="stat-card"><span>Completed value</span><strong>{formatCurrency(svc.completed_value)}</strong></div>
              </div>
              <p className="audit__funnel">
                {svc.service_viewers} people looked at a service, {svc.requests_placed} requests were placed in the app and{" "}
                {svc.requests_completed} were confirmed done.
                {svc.avg_rating ? ` Average service rating: ${svc.avg_rating}★ from ${svc.reviews} reviews.` : ""}
              </p>
              {svc.providers?.length > 0 && (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>People who viewed</th>
                      <th>Views</th>
                      <th>Requests</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svc.providers.map((p) => (
                      <tr key={p.provider_id}>
                        <td>{p.business_name}</td>
                        <td>{p.viewers}</td>
                        <td>{p.views}</td>
                        <td>{p.requests}</td>
                        <td>{p.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MonthlyAudit;