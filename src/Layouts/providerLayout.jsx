import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  User,
  Store,
  LogOut,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import NotificationBell from "../components/common/NotificationBell";

function ProviderLayout() {
  const { serviceProvider, signOut } = useAuth();
  const navigate = useNavigate();

  const providerName =
    serviceProvider?.business_name ||
    "My Services";

  const handleSignOut = async () => {
    await signOut();
    navigate("/provider/login");
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

          <NavLink to="/provider/profile">
            <User size={19} />
            Profile
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

export default ProviderLayout;