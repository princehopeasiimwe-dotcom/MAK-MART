import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, LayoutDashboard, LogOut, Package, ShieldCheck, Star } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

import usePageSeo from "../../hooks/usePageSeo";
import RatingService from "../../services/ratingService";
import OrderReviewModal from "../../components/account/OrderReviewModal";

function Account() {
  usePageSeo({ title: "Your account", noindex: true });

  const navigate = useNavigate();
  const { user, profile, isAdmin, isVendor, isServiceProvider, loading, signOut } =
    useAuth();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [orderError, setOrderError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let active = true;
    setOrdersLoading(true);

    const columns =
      "id, total_amount, status, created_at, delivery_confirmed_at, vendors ( business_name ), order_items ( product_id, product_name, quantity ), order_reviews ( status, vendor_rating )";

    supabase
      .from("orders")
      .select(columns)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(async ({ data, error }) => {
        if (!active) return;
        if (!error) {
          setOrders(data || []);
          return;
        }
        // Older database (migrations 017 not run yet): keep the plain list.
        const fallback = await supabase
          .from("orders")
          .select("id, total_amount, status, created_at, order_items ( product_name, quantity )")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (active) setOrders(fallback.data || []);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  const handleConfirm = async (order) => {
    setOrderError("");
    setBusyId(order.id);
    try {
      await RatingService.confirmDelivery(order.id);
      setReloadKey((k) => k + 1);
      setReviewing({ ...order, delivery_confirmed_at: new Date().toISOString() });
    } catch (err) {
      setOrderError(err.message || "Could not confirm delivery. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <section className="mm-account mm-container"><p className="mm-empty">Loading...</p></section>;
  }

  if (!user) {
    return (
      <section className="mm-account mm-container">
        <div className="mm-panel mm-panel--center">
          <span className="mm-eyebrow">YOUR ACCOUNT</span>
          <h1>Sign in to MAK MART</h1>
          <p>Log in to see your orders, or create a free account to start shopping.</p>
          <div className="mm-panel__actions">
            <Link to="/login" className="mm-btn mm-btn--primary">Log in</Link>
            <Link to="/signup" className="mm-btn mm-btn--outline">Create an account</Link>
          </div>
        </div>
      </section>
    );
  }

  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : isVendor
    ? "/vendor/dashboard"
    : isServiceProvider
    ? "/provider/dashboard"
    : null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  return (
    <section className="mm-account mm-container">
      <div className="mm-panel">
        <span className="mm-eyebrow">YOUR ACCOUNT</span>
        <h1>{profile?.full_name || "Welcome"}</h1>
        <p>{user.email}</p>

        <div className="mm-panel__actions">
          {dashboardPath && (
            <Link to={dashboardPath} className="mm-btn mm-btn--primary">
              <LayoutDashboard size={18} /> My dashboard
            </Link>
          )}
          {isAdmin && (
            <span className="mm-tag"><ShieldCheck size={15} /> Admin</span>
          )}
          <button type="button" className="mm-btn mm-btn--outline" onClick={handleSignOut}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </div>

      <div className="mm-panel">
        <h2><Package size={20} /> My orders</h2>

        {orderError && <div className="form-error">{orderError}</div>}

        {ordersLoading ? (
          <p className="mm-empty">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <p className="mm-empty">
            No orders yet. <Link to="/marketplace/products">Start shopping</Link>
          </p>
        ) : (
          <ul className="mm-orders">
            {orders.map((order) => {
              const review = Array.isArray(order.order_reviews)
                ? order.order_reviews[0]
                : order.order_reviews;
              return (
              <li key={order.id}>
                <div>
                  <strong>
                    {(order.order_items || [])
                      .map((item) => `${item.quantity} × ${item.product_name}`)
                      .join(", ") || "Order"}
                  </strong>
                  <small>{new Date(order.created_at).toLocaleDateString()}</small>
                </div>
                <div className="mm-orders__side">
                  <span>{formatCurrency(order.total_amount)}</span>
                  <em className={`mm-status mm-status--${order.status}`}>{order.status}</em>
                </div>

                {order.status !== "cancelled" && order.vendors && (
                  <div className="mm-orders__action">
                    {!order.delivery_confirmed_at ? (
                      <>
                        <span>Got your order from {order.vendors.business_name}?</span>
                        <button
                          type="button"
                          className="mm-btn mm-btn--primary mm-btn--sm"
                          disabled={busyId === order.id}
                          onClick={() => handleConfirm(order)}
                        >
                          <CheckCircle2 size={16} />
                          {busyId === order.id ? "Saving..." : "I received it"}
                        </button>
                      </>
                    ) : review ? (
                      <span className="mm-orders__done">
                        <CheckCircle2 size={16} /> Delivered · you rated {review.vendor_rating}
                        <Star size={14} fill="currentColor" />
                        {review.status === "pending" && " (awaiting approval)"}
                      </span>
                    ) : (
                      <>
                        <span className="mm-orders__done">
                          <CheckCircle2 size={16} /> Delivered
                        </span>
                        <button
                          type="button"
                          className="mm-btn mm-btn--outline mm-btn--sm"
                          onClick={() => setReviewing(order)}
                        >
                          <Star size={16} /> Rate this order
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {reviewing && (
        <OrderReviewModal
          order={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

export default Account;