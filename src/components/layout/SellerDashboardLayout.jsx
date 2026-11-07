import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  ShoppingCart,
  User,
  Store,
  LogOut,
  BarChart3,
  Wrench,
  Inbox,
  MessageSquare,
  Receipt,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useUnreadMessages from "../../hooks/useUnreadMessages";
import NotificationBell from "../common/NotificationBell";
import SellProductsCard from "../provider/SellProductsCard";
import OfferServiceCard from "../vendor/OfferServiceCard";

// Pages that only make sense once the account owns that kind of record.
// Everything else (dashboard, messages) is open to every signed-in account.
const NEEDS_STORE = ["products", "orders", "sales", "events"];
const NEEDS_SERVICES = ["services", "requests"];

// ONE sidebar for vendors, service providers and ordinary accounts, so the
// menu is the same wherever you are. /vendor/* and /provider/* both use it.
function SellerDashboardLayout() {
  const { vendor, serviceProvider, profile, isAdmin, signOut, user } = useAuth();
  const unread = useUnreadMessages(user?.id);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const area = pathname.startsWith("/provider") ? "provider" : "vendor";
  const page = pathname.split("/")[2] || "dashboard";

  const hasStore = Boolean(vendor);
  const hasServices = Boolean(serviceProvider);

  const missingStore = !hasStore && (
    NEEDS_STORE.includes(page) ||
    (area === "vendor" && ["insights", "profile"].includes(page))
  );
  const missingServices = !hasServices && (
    NEEDS_SERVICES.includes(page) ||
    (area === "provider" && ["insights", "profile"].includes(page))
  );

  const label = area === "provider" && hasServices
    ? "SERVICE PROVIDER"
    : hasStore
    ? "VENDOR STORE"
    : hasServices
    ? "SERVICE PROVIDER"
    : "MY ACCOUNT";

  const name =
    (area === "provider" ? serviceProvider?.business_name : vendor?.business_name) ||
    vendor?.business_name ||
    serviceProvider?.business_name ||
    profile?.full_name ||
    "Welcome";

  // Insights and Profile exist for both sides; point at whichever the account has.
  const side = !hasStore && hasServices ? "provider" : "vendor";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  let content = <Outlet />;
  if (!isAdmin) {
    if (missingStore) content = <section className="dashboard-page"><SellProductsCard /></section>;
    else if (missingServices) content = <section className="dashboard-page"><OfferServiceCard /></section>;
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Store size={25} />
          <span>MAK MART</span>
        </div>

        <div className="dashboard-store">
          <small>{label}</small>
          <strong>{name}</strong>
        </div>

        <nav className="dashboard-nav">
          <NavLink to={`/${area}/dashboard`}>
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink to="/vendor/products">
            <Package size={19} />
            Products
          </NavLink>

          <NavLink to="/provider/services">
            <Wrench size={19} />
            Services
          </NavLink>

          <NavLink to="/vendor/orders">
            <ShoppingCart size={19} />
            Orders
          </NavLink>

          <NavLink to="/provider/requests">
            <Inbox size={19} />
            Requests
          </NavLink>

          <NavLink to="/vendor/events">
            <CalendarDays size={19} />
            Events
          </NavLink>

          <NavLink to={`/${area}/messages`}>
            <MessageSquare size={19} />
            Messages
            {unread > 0 && <span className="nav-badge" aria-label={`${unread} unread`}>{unread}</span>}
          </NavLink>

          <NavLink to="/vendor/sales">
            <Receipt size={19} />
            Sales report
          </NavLink>

          <NavLink to={`/${side}/insights`}>
            <BarChart3 size={19} />
            {hasStore && hasServices ? "Store insights" : "Insights"}
          </NavLink>

          {hasStore && hasServices && (
            <NavLink to="/provider/insights">
              <BarChart3 size={19} />
              Service insights
            </NavLink>
          )}

          <NavLink to={`/${side}/profile`}>
            <User size={19} />
            {hasStore && hasServices ? "Store profile" : "Profile"}
          </NavLink>

          {hasStore && hasServices && (
            <NavLink to="/provider/profile">
              <User size={19} />
              Service profile
            </NavLink>
          )}
        </nav>

        <Link to="/" className="dashboard-sidebar__signout dashboard-sidebar__home">
          <Store size={18} />
          View marketplace
        </Link>

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

        {content}
      </main>
    </div>
  );
}

export default SellerDashboardLayout;
