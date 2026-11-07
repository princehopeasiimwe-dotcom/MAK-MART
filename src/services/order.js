import { supabase } from "../lib/supabase";

const OrderService = {
  async getOrders(vendorId = null) {
    let query = supabase
      .from("orders")
      .select(
        `*, profiles:buyer_id ( full_name, phone ), order_items ( id, product_id, product_name, quantity, unit_price, subtotal )`
      )
      .order("created_at", { ascending: false });

    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  // Orders are created by the database function place_order(),
  // which reads prices from the products table, checks stock and
  // computes the total itself. The browser only sends product ids
  // and quantities - it can no longer choose its own prices.
  //
  // Returns the new order id, or null if the buyer isn't signed in
  // (guest checkout still works via WhatsApp, it just won't have a
  // database record).
  async createOrder(order) {
    return OrderService.createMultiItemOrder({
      vendorId: order.vendor_id,
      items: [{ id: order.product_id, quantity: order.quantity || 1 }],
      customerLocation: order.customer_location,
      notes: order.notes,
    });
  },

  // Same as createOrder, but for a whole cart from one vendor.
  async createMultiItemOrder({
    vendorId,
    items,
    customerLocation,
    notes,
  }) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data, error } = await supabase.rpc("place_order", {
      p_vendor_id: vendorId,
      p_items: items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
      p_delivery_location: customerLocation || null,
      p_notes: notes || null,
    });

    if (error) throw error;

    return data;
  },
  async updateOrderStatus(id, status) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },
};

export default OrderService;