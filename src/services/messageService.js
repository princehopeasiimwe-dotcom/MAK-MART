import { supabase } from "../lib/supabase";

const MessageService = {
  async conversations() {
    const { data, error } = await supabase.rpc("my_conversations");
    if (error) throw error;
    return data || [];
  },

  async directory() {
    const { data, error } = await supabase.rpc("message_directory");
    if (error) throw error;
    return data || [];
  },

  async openSupport(userId = null) {
    const { data, error } = await supabase.rpc("open_support_chat", { p_user: userId });
    if (error) throw error;
    return data;
  },

  async openDirect(otherUserId) {
    const { data, error } = await supabase.rpc("open_direct_chat", { p_other: otherUserId });
    if (error) throw error;
    return data;
  },

  async messages(conversationId) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, sender_is_admin, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw error;
    return data || [];
  },

  async send(conversationId, body) {
    const { data, error } = await supabase.rpc("send_message", {
      p_conversation: conversationId,
      p_body: body,
    });
    if (error) throw error;
    return data;
  },

  async markRead(conversationId) {
    await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
  },

  async unreadCount() {
    const { data, error } = await supabase.rpc("unread_message_count");
    if (error) throw error;
    return Number(data) || 0;
  },

  async deleteMyAccount(confirm) {
    const { error } = await supabase.rpc("delete_my_account", { p_confirm: confirm });
    if (error) throw error;
  },
};

export default MessageService;