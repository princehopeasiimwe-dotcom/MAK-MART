import { supabase } from "../lib/supabase";

const SERVICE_SELECT = `
  *,
  service_providers (
    id,
    business_name,
    phone,
    location
  ),
  service_categories (
    id,
    name,
    image_url
  )
`;

const PROVIDER_SELECT = `*`;

const ServiceService = {
  // ---- SERVICE LISTINGS (what customers browse) ----

  async getServices(options = {}) {
    let query = supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("is_available", true)
      .order("created_at", { ascending: false });

    if (options.category) {
      query = query.eq("category_id", options.category);
    }

    if (options.providerId) {
      query = query.eq("provider_id", options.providerId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async getServiceById(id) {
    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;

    return data;
  },

  async getServiceCategories() {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return data || [];
  },

  async getServicesByProvider(providerId) {
    const { data, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  async createService(service) {
    const { data, error } = await supabase
      .from("services")
      .insert([service])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateService(id, updates) {
    const { data, error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async deleteService(id) {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },

  // ---- SERVICE PROVIDERS (the business itself) ----

  async getProviders(filter = "active") {
    let query = supabase
      .from("service_providers")
      .select(PROVIDER_SELECT)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("is_active", true);
    } else if (filter === "pending") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async getProviderById(id) {
    const { data, error } = await supabase
      .from("service_providers")
      .select(PROVIDER_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;

    return data;
  },

  async getProviderByOwnerId(ownerId) {
    const { data, error } = await supabase
      .from("service_providers")
      .select(PROVIDER_SELECT)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async getAllProviders(filter = null) {
    let query = supabase
      .from("service_providers")
      .select(PROVIDER_SELECT)
      .order("created_at", { ascending: false });

    if (filter === "active") {
      query = query.eq("is_active", true);
    } else if (filter === "pending") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async createProvider(provider) {
    const { data, error } = await supabase
      .from("service_providers")
      .insert([provider])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateProvider(id, updates) {
    const { data, error } = await supabase
      .from("service_providers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async approveProvider(id) {
    return ServiceService.updateProvider(id, {
      is_active: true,
      is_verified: true,
    });
  },

  async rejectProvider(id) {
    return ServiceService.updateProvider(id, {
      is_active: false,
    });
  },
};

export default ServiceService;
