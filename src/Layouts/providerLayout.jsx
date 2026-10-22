import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  Inbox,
  BarChart3,
  ArrowLeft,
  MessageSquare,
  User,
  Store,
  LogOut,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import useUnreadMessages from "../hooks/useUnreadMessages";
import NotificationBell from "../components/common/NotificationBell";
import OfferServiceCard from "../components/vendor/OfferServiceCard";

function ProviderLayout() {
  const { serviceProvider, signOut, isVendor, isAdmin, user } = useAuth();
  const unread = useUnreadMessages(user?.id);
  const navigate = useNavigate();

  const providerName =
    serviceProvider?.business_name ||
    "My Services";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Store size={25} />
          <span>MAK MART</span>
        </div>

        <div className="dashboard-store">
          <small>SERVICE PROVIDER</small>
          <strong>{providerName}</strong>
        </div>

        <nav className="dashboard-nav">
          <NavLink to="/provider/dashboard">
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink to="/provider/services">
            <Wrench size={19} />
            Services
          </NavLink>

          <NavLink to="/provider/requests">
            <Inbox size={19} />
            Requests
          </NavLink>

          <NavLink to="/provider/messages">
            <MessageSquare size={19} />
            Messages
            {unread > 0 && <span className="nav-badge" aria-label={`${unread} unread`}>{unread}</span>}
          </NavLink>

          <NavLink to="/provider/insights">
            <BarChart3 size={19} />
            Insights
          </NavLink>

          <NavLink to="/provider/profile">
            <User size={19} />
            Profile
          </NavLink>
        </nav>

        {isVendor && (
          <Link to="/vendor/dashboard" className="dashboard-sidebar__signout dashboard-sidebar__home">
            <ArrowLeft size={18} />
            Back to my store
          </Link>
        )}

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

        {serviceProvider || isAdmin ? <Outlet /> : <OfferServiceCard />}
      </main>
    </div>
  );
}

export default ProviderLayout;