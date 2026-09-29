import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  ShoppingCart,
  User,
  Store,
  LogOut,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import NotificationBell from "../components/common/NotificationBell";

function VendorLayout() {
  const { vendor, signOut } = useAuth();
  const navigate = useNavigate();

  const vendorName =
    vendor?.business_name ||
    "My Store";

  const handleSignOut = async () => {
    await signOut();
    navigate("/vendor/login");
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Store size={25} />
          <span>MAK MART</span>
        </div>

        <div className="dashboard-store">
          <small>VENDOR STORE</small>
          <strong>{vendorName}</strong>
        </div>

        <nav className="dashboard-nav">
          <NavLink to="/vendor/dashboard">
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink to="/vendor/products">
            <Package size={19} />
            Products
          </NavLink>

          <NavLink to="/vendor/events">
            <CalendarDays size={19} />
            Events
          </NavLink>

          <NavLink to="/vendor/orders">
            <ShoppingCart size={19} />
            Orders
          </NavLink>

          <NavLink to="/vendor/profile">
            <User size={19} />
            Store Profile
          </NavLink>
        </nav>

        <button
          type="button"
          className="dashboard-sidebar__signout"
          onClick={handleSignOut}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <NotificationBell />
        </div>

        <Outlet />
      </main>
    </div>
  );
}

export default VendorLayout;