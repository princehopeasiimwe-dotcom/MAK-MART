import { supabase } from "../lib/supabase";

const RatingService = {
  // Public star averages. These views never contain comments or names.
  async getVendorStats() {
    const { data, error } = await supabase
      .from("vendor_rating_stats")
      .select("vendor_id, rating_count, rating_avg, delivered_orders, rank_score");
    if (error) throw error;
    return data || [];
  },

  async getProductStats() {
    const { data, error } = await supabase
      .from("product_rating_stats")
      .select("product_id, rating_count, rating_avg, rank_score");
    if (error) throw error;
    return data || [];
  },

  async confirmDelivery(orderId) {
    const { error } = await supabase.rpc("confirm_delivery", { p_order_id: orderId });
    if (error) throw error;
  },

  async submitReview({ orderId, vendorRating, comment, productRatings }) {
    const { data, error } = await supabase.rpc("submit_order_review", {
      p_order_id: orderId,
      p_vendor_rating: vendorRating,
      p_comment: comment || null,
      p_product_ratings: (productRatings || []).map((r) => ({
        product_id: r.productId,
        rating: r.rating,
      })),
    });
    if (error) throw error;
    return data;
  },

  // Admin
  async getReviews(status) {
    let query = supabase
      .from("order_reviews")
      .select(
        "id, order_id, vendor_rating, comment, status, admin_note, created_at, vendors ( business_name ), profiles:buyer_id ( full_name ), order_product_ratings ( rating, products ( name ) )"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async moderate(reviewId, status, note) {
    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: reviewId,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw error;
  },
};

export default RatingService;