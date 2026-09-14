import { supabase } from "../lib/supabase";

const EventService = {
  async getEvents(options = {}) {
    let query = supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (options.createdBy) {
      query = query.eq("created_by", options.createdBy);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  },

  async getEventById(id) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return data;
  },

  async getFeaturedEvents(limit = 6) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data || [];
  },

  async createEvent(event) {
    const { data, error } = await supabase
      .from("events")
      .insert([event])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async deleteEvent(id) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },

  async approveEvent(id) {
    return EventService.updateEvent(id, {
      is_active: true,
    });
  },

  async rejectEvent(id) {
    return EventService.updateEvent(id, {
      is_active: false,
    });
  },
};

export default EventService;
