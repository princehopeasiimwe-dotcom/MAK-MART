import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  Package,
  CalendarDays,
  BriefcaseBusiness,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import AdminService from "../../services/adminService";
import { formatCurrency } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatters";

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [statsData, ordersData] = await Promise.all([
          AdminService.getDashboardStats(),
          AdminService.getRecentOrders(5),
        ]);

        if (!cancelled) {
          setStats(statsData);
          setRecentOrders(ordersData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load dashboard.");
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

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p className="form-error">{error}</p>;

  const pendingTotal =
    (stats?.vendorsPending || 0) +
    (stats?.eventsPending || 0) +
    (stats?.servicesPending || 0);

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Control Centre</h1>
          <p>An overview of everything happening on KU Market.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Store size={24} />
          <span>Vendors</span>
          <strong>{stats.vendorsTotal}</strong>
        </div>

        <div className="stat-card">
          <Package size={24} />
          <span>Active Products</span>
          <strong>{stats.productsTotal}</strong>
        </div>

        <div className="stat-card">
          <ShoppingCart size={24} />
          <span>Orders</span>
          <strong>{stats.ordersTotal}</strong>
        </div>

        <div className="stat-card">
          <Wallet size={24} />
          <span>Revenue (completed)</span>
          <strong>{formatCurrency(stats.totalRevenue)}</strong>
        </div>
      </div>

      <div className="page-header">
        <h2>Needs your review</h2>
      </div>

      <div className="stats-grid">
        {stats.vendorsPending > 0 && (
          <Link to="/admin/vendors" className="stat-card">
            <Store size={24} />
            <span>Pending Vendors</span>
            <strong>{stats.vendorsPending}</strong>
          </Link>
        )}

        {stats.eventsPending > 0 && (
          <Link to="/admin/events" className="stat-card">
            <CalendarDays size={24} />
            <span>Pending Events</span>
            <strong>{stats.eventsPending}</strong>
          </Link>
        )}

        {stats.servicesPending > 0 && (
          <Link to="/admin/services" className="stat-card">
            <BriefcaseBusiness size={24} />
            <span>Pending Services</span>
            <strong>{stats.servicesPending}</strong>
          </Link>
        )}

        {pendingTotal === 0 && (
          <div className="empty-state">
            <p>Nothing pending review right now.</p>
          </div>
        )}
      </div>

      <div className="page-header">
        <h2>Recent orders</h2>
      </div>

      {recentOrders.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.profiles?.full_name || "—"}</td>
                <td>{formatCurrency(order.total_amount)}</td>
                <td>
                  <span className={`status-badge status-badge--${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>{formatDateTime(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminDashboard;
