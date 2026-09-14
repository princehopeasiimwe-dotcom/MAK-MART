import { supabase } from "../lib/supabase";

const AdminService = {
  async getDashboardStats() {
    const [
      vendorsTotal,
      vendorsPending,
      productsTotal,
      eventsPending,
      servicesPending,
      ordersTotal,
      revenue,
    ] = await Promise.all([
      supabase
        .from("vendors")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_available", true),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
      supabase
        .from("service_providers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed"),
    ]);

    const totalRevenue = (revenue.data || []).reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    return {
      vendorsTotal: vendorsTotal.count || 0,
      vendorsPending: vendorsPending.count || 0,
      productsTotal: productsTotal.count || 0,
      eventsPending: eventsPending.count || 0,
      servicesPending: servicesPending.count || 0,
      ordersTotal: ordersTotal.count || 0,
      totalRevenue,
    };
  },

  async getRecentOrders(limit = 5) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `*, profiles:buyer_id ( full_name, phone ), order_items ( product_name, quantity, subtotal )`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  },
};

export default AdminService;
