import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Package, ShieldCheck } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

function Account() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isVendor, isServiceProvider, loading, signOut } =
    useAuth();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    setOrdersLoading(true);

    supabase
      .from("orders")
      .select("id, total_amount, status, created_at, order_items ( product_name, quantity )")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setOrders(data || []);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

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

        {ordersLoading ? (
          <p className="mm-empty">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <p className="mm-empty">
            No orders yet. <Link to="/marketplace/products">Start shopping</Link>
          </p>
        ) : (
          <ul className="mm-orders">
            {orders.map((order) => (
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default Account;