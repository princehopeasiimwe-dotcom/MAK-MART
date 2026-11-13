import { supabase } from "../lib/supabase";

const NotificationService = {
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return data || [];
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return count || 0;
  },

  async markAsRead(id) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;

    return true;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return true;
  },

  // Admin-only (RLS enforces this) - used when approving vendors,
  // rejecting content, etc.
  async createNotification({ userId, title, message, type = "general" }) {
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        title,
        message,
        type,
      },
    ]);

    if (error) throw error;

    return true;
  },
};

export default NotificationService;