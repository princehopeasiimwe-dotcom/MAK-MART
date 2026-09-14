import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

function AdminReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: vendors, error: vendorsError } = await supabase
          .from("vendors")
          .select("id, business_name, location")
          .eq("is_active", true);

        if (vendorsError) throw vendorsError;

        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("vendor_id, total_amount, status");

        if (ordersError) throw ordersError;

        const report = (vendors || []).map((vendor) => {
          const vendorOrders = (orders || []).filter(
            (order) => order.vendor_id === vendor.id
          );

          const completed = vendorOrders.filter(
            (order) => order.status === "completed"
          );

          const revenue = completed.reduce(
            (sum, order) => sum + Number(order.total_amount || 0),
            0
          );

          return {
            ...vendor,
            orderCount: vendorOrders.length,
            revenue,
          };
        });

        report.sort((a, b) => b.revenue - a.revenue);

        if (!cancelled) setRows(report);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load reports.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Building reports...</p>;
  if (error) return <p className="form-error">{error}</p>;

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Reports</h1>
          <p>Vendor performance by orders and completed revenue.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h3>Not enough data yet</h3>
          <p>Reports fill in as vendors get approved and orders come in.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Location</th>
              <th>Orders</th>
              <th>Revenue (completed)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.business_name}</td>
                <td>{row.location}</td>
                <td>{row.orderCount}</td>
                <td>{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminReports;
