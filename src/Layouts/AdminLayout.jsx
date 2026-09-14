import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Package,
  CalendarDays,
  BriefcaseBusiness,
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import NotificationBell from "../components/common/NotificationBell";

function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/vendor/login");
  };

  return (
    <div className="dashboard-layout admin-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <ShieldCheck size={25} />
          <span>KU Market Admin</span>
        </div>

        <div className="dashboard-store">
          <small>ADMINISTRATION</small>
          <strong>Control Centre</strong>
        </div>

        <nav className="dashboard-nav">
          <NavLink to="/admin/dashboard">
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink to="/admin/vendors">
            <Store size={19} />
            Vendors
          </NavLink>

          <NavLink to="/admin/products">
            <Package size={19} />
            Products
          </NavLink>

          <NavLink to="/admin/events">
            <CalendarDays size={19} />
            Events
          </NavLink>

          <NavLink to="/admin/services">
            <BriefcaseBusiness size={19} />
            Services
          </NavLink>

          <NavLink to="/admin/orders">
            <ShoppingCart size={19} />
            Orders
          </NavLink>

          <NavLink to="/admin/reports">
            <BarChart3 size={19} />
            Reports
          </NavLink>

          <NavLink to="/admin/settings">
            <Settings size={19} />
            Settings
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

export default AdminLayout;