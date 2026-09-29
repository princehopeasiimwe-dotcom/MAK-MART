import { useEffect, useState } from "react";
import {
  Package,
  CalendarDays,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

function VendorDashboard() {
  const { user, vendor } = useAuth();

  const [stats, setStats] = useState({
    products: 0,
    events: 0,
    orders: 0,
  });

  useEffect(() => {
    if (!vendor?.id || !user?.id) return;

    const loadStats = async () => {
      const [
        productsResult,
        eventsResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("vendor_id", vendor.id),

        supabase
          .from("events")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("created_by", user.id),

        supabase
          .from("orders")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("vendor_id", vendor.id),
      ]);

      setStats({
        products:
          productsResult.count || 0,
        events:
          eventsResult.count || 0,
        orders:
          ordersResult.count || 0,
      });
    };

    loadStats();
  }, [vendor?.id, user?.id]);

  const statusLabel = !vendor
    ? "Not set up"
    : vendor.is_active
    ? "Live"
    : "Pending approval";

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <span className="eyebrow">
          VENDOR DASHBOARD
        </span>

        <h1>
          Welcome, {vendor?.business_name || "Vendor"}
        </h1>

        <p>
          Manage your MAK MART storefront.
        </p>
      </div>

      {vendor && !vendor.is_active && (
        <div className="active-filter">
          Your store is awaiting admin approval. Your
          products won't appear publicly until then.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <Package size={24} />
          <span>Products</span>
          <strong>{stats.products}</strong>
        </div>

        <div className="stat-card">
          <CalendarDays size={24} />
          <span>Events</span>
          <strong>{stats.events}</strong>
        </div>

        <div className="stat-card">
          <ShoppingCart size={24} />
          <span>Orders</span>
          <strong>{stats.orders}</strong>
        </div>

        <div className="stat-card">
          <Wallet size={24} />
          <span>Status</span>
          <strong>{statusLabel}</strong>
        </div>
      </div>
    </section>
  );
}

export default VendorDashboard;
