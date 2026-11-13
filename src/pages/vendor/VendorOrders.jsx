import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import OrderService from "../../services/order";
import { formatCurrency } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatters";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";
import RatingService from "../../services/ratingService";

function VendorOrders() {
  const { vendor } = useAuth();

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!vendor?.id) return;

    const loadOrders = async () => {
      const data = await OrderService.getOrders(vendor.id);
      setOrders(data || []);
      setLoading(false);
    };

    loadOrders();
  }, [vendor?.id, reloadKey]);

  const toggleDelivered = async (order) => {
    setBusyId(order.id);
    setError("");
    try {
      if (order.delivery_confirmed_at) {
        await RatingService.unmarkOrderDelivered(order.id);
      } else {
        await RatingService.markOrderDelivered(order.id);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Could not update the order. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Loader message="Loading orders..." />;
  }

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <span className="eyebrow">
          CUSTOMER ORDERS
        </span>

        <h1>Orders</h1>
        <p>
          When you have handed an order over, tick <strong>Mark as delivered</strong>. The buyer is then
          asked to rate you, and the sale is counted in your reports.
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!orders.length ? (
        <EmptyState
          title="No orders yet"
          message="Orders from customers will appear here."
        />
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article
              key={order.id}
              className="order-item"
            >
              <div>
                <strong>
                  Order #{order.id.slice(0, 8)}
                </strong>

                <div>
                  {(order.order_items || [])
                    .map(
                      (item) =>
                        `${item.product_name} x${item.quantity}`
                    )
                    .join(", ")}
                </div>

                <small>
                  {formatCurrency(order.total_amount)} ·{" "}
                  {formatDateTime(order.created_at)}
                </small>
              </div>

              <div className="order-item__side">
                <span>
                  {order.status}
                </span>

                {order.status !== "cancelled" && (
                  <button
                    type="button"
                    className={order.delivery_confirmed_at ? "secondary-button" : "primary-button"}
                    disabled={busyId === order.id}
                    onClick={() => toggleDelivered(order)}
                  >
                    {busyId === order.id
                      ? "Saving..."
                      : order.delivery_confirmed_at
                      ? "Delivered ✓ (undo)"
                      : "Mark as delivered"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default VendorOrders;