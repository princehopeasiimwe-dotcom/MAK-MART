import { supabase } from "../lib/supabase";

const SponsorService = {
  // Public: active sponsors only (RLS also enforces this for non-admins)
  async getActive() {
    const { data, error } = await supabase
      .from("sponsors")
      .select("id, name, logo_url, link_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Admin: everything, including hidden sponsors
  async getAll() {
    const { data, error } = await supabase
      .from("sponsors")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(sponsor) {
    const { error } = await supabase.from("sponsors").insert(sponsor);
    if (error) throw error;
  },

  async update(id, changes) {
    const { error } = await supabase
      .from("sponsors")
      .update(changes)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) throw error;
  },
};

export default SponsorService;