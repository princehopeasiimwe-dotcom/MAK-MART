import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";

import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

// Uganda day (UTC+3) as YYYY-MM-DD, n days ago
function kampalaDay(daysAgo = 0) {
  const t = Date.now() + 3 * 3600 * 1000 - daysAgo * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

const PRESETS = [
  { key: "7", label: "Last 7 days", from: () => kampalaDay(6) },
  { key: "30", label: "Last 30 days", from: () => kampalaDay(29) },
  { key: "month", label: "This month", from: () => `${kampalaDay(0).slice(0, 8)}01` },
  { key: "custom", label: "Pick dates" },
];

function csvCell(value) {
  const text = String(value ?? "");
  // stop spreadsheet formulas from running if a name starts with = + - @
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function VendorSales() {
  const [preset, setPreset] = useState("30");
  const [from, setFrom] = useState(kampalaDay(29));
  const [to, setTo] = useState(kampalaDay(0));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    supabase
      .rpc("vendor_sales_report", { p_from: from, p_to: to, p_vendor_id: null })
      .then(({ data, error: rpcError }) => {
        if (off) return;
        if (rpcError) {
          setReport(null);
          setError(
            /does not exist/i.test(rpcError.message || "")
              ? "The sales report needs the latest database update."
              : rpcError.message || "Could not load your sales report."
          );
        } else {
          setReport(data);
          setError("");
        }
        setLoading(false);
      });
    return () => {
      off = true;
    };
  }, [from, to]);

  const choosePreset = (item) => {
    setPreset(item.key);
    if (item.from) {
      setLoading(true);
      setFrom(item.from());
      setTo(kampalaDay(0));
    }
  };

  const maxRevenue = useMemo(
    () => Math.max(1, ...(report?.daily || []).map((d) => Number(d.revenue) || 0)),
    [report]
  );

  const downloadCsv = () => {
    if (!report) return;
    const rows = [
      ["Date", "Status", "Items", "Total (UGX)", "Counted as sale"],
      ...(report.orders || []).map((o) => [
        new Date(o.created_at).toLocaleString(),
        o.status,
        o.items || "",
        o.total,
        o.completed ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mak-mart-sales-${from}-to-${to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="dashboard-page sales-report">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">MY STORE</span>
          <h1>Sales report</h1>
          <p>Money counts as a sale once the buyer confirms delivery or you mark the order completed.</p>
        </div>

        <div className="sales-report__actions no-print">
          <button type="button" className="secondary-button" onClick={downloadCsv} disabled={!report}>
            <Download size={16} /> Download CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => window.print()} disabled={!report}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="insights-periods no-print" role="group" aria-label="Period">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === preset ? "is-active" : ""}
            onClick={() => choosePreset(item)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="sales-report__dates no-print">
          <label>
            From
            <input type="date" value={from} max={to} onChange={(e) => {
                setLoading(true);
                setFrom(e.target.value);
              }} />
          </label>
          <label>
            To
            <input type="date" value={to} min={from} max={kampalaDay(0)} onChange={(e) => {
                setLoading(true);
                setTo(e.target.value);
              }} />
          </label>
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
      {loading && <p>Loading your report...</p>}

      {!loading && report && (
        <>
          <p className="sales-report__range">
            {report.from} to {report.to}
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Sales (delivered)</span>
              <strong>{formatCurrency(report.revenue_completed)}</strong>
            </div>
            <div className="stat-card">
              <span>Orders delivered</span>
              <strong>{report.orders_completed}</strong>
            </div>
            <div className="stat-card">
              <span>Still open</span>
              <strong>{report.orders_open}</strong>
              <small>{formatCurrency(report.value_open)} waiting</small>
            </div>
            <div className="stat-card">
              <span>Cancelled</span>
              <strong>{report.orders_cancelled}</strong>
            </div>
          </div>

          {report.orders_total === 0 ? (
            <div className="empty-state">
              <h3>No orders in this period</h3>
              <p>Try a longer period, or share your store to get more orders.</p>
            </div>
          ) : (
            <>
              <h2>Sales by day</h2>
              <ol className="sales-bars" aria-label="Sales by day">
                {report.daily.map((d) => (
                  <li key={d.day} title={`${d.day}: ${formatCurrency(d.revenue)}, ${d.orders} order(s)`}>
                    <span className="sales-bars__bar" style={{ height: `${Math.max(2, (Number(d.revenue) / maxRevenue) * 100)}%` }} />
                    <span className="sales-bars__label">{d.day.slice(8)}</span>
                  </li>
                ))}
              </ol>

              <h2>Best sellers</h2>
              {report.top_products.length === 0 ? (
                <p className="field-hint">No delivered orders yet in this period.</p>
              ) : (
                <ol className="sales-top">
                  {report.top_products.map((p) => (
                    <li key={p.name}>
                      <span>{p.name}</span>
                      <em>{p.qty} sold</em>
                      <strong>{formatCurrency(p.revenue)}</strong>
                    </li>
                  ))}
                </ol>
              )}

              <h2>Orders</h2>
              <div className="sales-table-wrap">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id}>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>{o.items || "-"}</td>
                        <td>{o.completed ? "delivered" : o.status}</td>
                        <td>{formatCurrency(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default VendorSales;