import { supabase } from "../lib/supabase";

const VendorService = {
  async getVendors(filter = "active") {
    let query = supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("is_active", true);
    } else if (filter === "pending") {
      query = query.eq("is_active", false);
    }
    // filter === null / "all" -> no filter

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async getVendorById(id) {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async getVendorByOwnerId(ownerId) {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async createVendor(vendor) {
    const { data, error } = await supabase
      .from("vendors")
      .insert([vendor])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateVendor(id, updates) {
    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async approveVendor(id) {
    return VendorService.updateVendor(id, {
      is_active: true,
      is_verified: true,
    });
  },

  async rejectVendor(id) {
    return VendorService.updateVendor(id, {
      is_active: false,
    });
  },
};

export default VendorService;
