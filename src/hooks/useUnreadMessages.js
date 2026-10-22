import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import MessageService from "../services/messageService";

// Unread chat count for the sidebar badge. Updates live when a message
// arrives, and re-checks once a minute as a safety net.
export default function useUnreadMessages(userId) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!userId) return;
    MessageService.unreadCount().then(setCount).catch(() => setCount(0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;

    refresh();
    const timer = setInterval(refresh, 60_000);
    const channel = supabase
      .channel(`unread-messages:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .subscribe();
    window.addEventListener("mm:messages-read", refresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mm:messages-read", refresh);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return count;
}