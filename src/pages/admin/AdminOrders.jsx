import { useEffect, useState } from "react";

import OrderService from "../../services/order";
import { formatCurrency } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatters";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "completed",
  "cancelled",
];

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OrderService.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    try {
      await OrderService.updateOrderStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update order.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Orders</h1>
          <p>All orders placed across the marketplace.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  {order.profiles?.full_name || "—"}
                  <br />
                  <small>{order.profiles?.phone || ""}</small>
                </td>
                <td>
                  {(order.order_items || [])
                    .map(
                      (item) =>
                        `${item.product_name} x${item.quantity}`
                    )
                    .join(", ") || "—"}
                </td>
                <td>{formatCurrency(order.total_amount)}</td>
                <td>
                  <select
                    value={order.status}
                    disabled={busyId === order.id}
                    onChange={(event) =>
                      handleStatusChange(order.id, event.target.value)
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
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

export default AdminOrders;
