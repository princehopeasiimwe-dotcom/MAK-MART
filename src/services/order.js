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

  // Returns the created order, or null if the buyer isn't
  // signed in (guest checkout still works via WhatsApp, it
  // just won't have a database record under this schema,
  // since orders.buyer_id is required and RLS-enforced).
  async createOrder(order) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: orderRow, error } = await supabase
      .from("orders")
      .insert([
        {
          buyer_id: session.user.id,
          vendor_id: order.vendor_id,
          total_amount: order.total_amount,
          delivery_location: order.customer_location || null,
          delivery_notes: order.notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const { error: itemError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: orderRow.id,
          product_id: order.product_id,
          product_name: order.product_name,
          quantity: order.quantity || 1,
          unit_price: order.unit_price,
        },
      ]);

    if (itemError) throw itemError;

    return orderRow;
  },
  // Same guest-friendly behavior as createOrder, but for a
  // whole cart's worth of items from a single vendor at once.
  async createMultiItemOrder({
    vendorId,
    items,
    totalAmount,
    customerLocation,
    notes,
  }) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data: orderRow, error } = await supabase
      .from("orders")
      .insert([
        {
          buyer_id: session.user.id,
          vendor_id: vendorId,
          total_amount: totalAmount,
          delivery_location: customerLocation || null,
          delivery_notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(
        items.map((item) => ({
          order_id: orderRow.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      );

    if (itemsError) throw itemsError;

    return orderRow;
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
