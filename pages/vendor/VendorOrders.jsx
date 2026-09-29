import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import OrderService from "../../services/order";
import { formatCurrency } from "../../utils/currency";
import { formatDateTime } from "../../utils/formatters";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";

function VendorOrders() {
  const { vendor } = useAuth();

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!vendor?.id) return;

    const loadOrders = async () => {
      const data = await OrderService.getOrders(vendor.id);
      setOrders(data || []);
      setLoading(false);
    };

    loadOrders();
  }, [vendor?.id]);

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
      </div>

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

              <span>
                {order.status}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default VendorOrders;
