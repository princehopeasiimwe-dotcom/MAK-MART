import { supabase } from "../lib/supabase";

const ReviewService = {
  async getReviews(productId) {
    const { data, error } =
      await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", {
          ascending: false,
        });

    if (error) throw error;

    return data || [];
  },
};

export default ReviewService;