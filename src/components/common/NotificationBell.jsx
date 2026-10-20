import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import NotificationService from "../../services/notificationService";
import useAuth from "../../hooks/useAuth";
import usePushNotifications from "../../hooks/usePushNotifications";
import { supabase } from "../../lib/supabase";
import {
  getNotificationLink,
  splitMessageLinks,
} from "../../lib/notificationLinks";
import { formatRelativeDate } from "../../utils/formatters";

function NotificationMessage({ text }) {
  return splitMessageLinks(text).map((part, index) =>
    part.type === "link" ? (
      <a
        key={index}
        href={part.value}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {part.value}
      </a>
    ) : (
      <span key={index}>{part.value}</span>
    )
  );
}

function PushRow({ userId }) {
  const { status, busy, error, enable, disable } =
    usePushNotifications(userId);

  if (status === "hidden") return null;

  return (
    <div className="notification-bell__push">
      {status === "needs-install" && (
        <p>
          <BellRing size={14} /> To get alerts on your iPhone, tap Share, then
          &ldquo;Add to Home Screen&rdquo;, and open MAK MART from there.
        </p>
      )}

      {status === "blocked" && (
        <p>
          <BellRing size={14} /> Notifications are blocked. Allow them for MAK
          MART in your phone or browser settings.
        </p>
      )}

      {status === "off" && (
        <button type="button" onClick={enable} disabled={busy}>
          <BellRing size={14} />
          {busy ? "Turning on..." : "Get alerts on this phone"}
        </button>
      )}

      {status === "on" && (
        <p>
          <BellRing size={14} /> Phone alerts are on.{" "}
          <button type="button" onClick={disable} disabled={busy}>
            Turn off
          </button>
        </p>
      )}

      {error && <p className="notification-bell__push-error">{error}</p>}
    </div>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const load = useCallback(async () => {
    if (!userId) return;

    try {
      const [list, count] = await Promise.all([
        NotificationService.getNotifications(userId),
        NotificationService.getUnreadCount(userId),
      ]);

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    // Backup refresh in case the live connection drops.
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  // Live updates: a new notification shows up in the bell instantly.
  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Refresh when a phone push arrives or the app comes back to the front.
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "push-received") load();
    };

    const handleVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setOpen((current) => !current);
  };

  const handleNotificationClick = async (notification) => {
    const link = getNotificationLink(notification);

    setOpen(false);

    if (!notification.is_read) {
      // optimistic: the dot disappears immediately
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      NotificationService.markAsRead(notification.id).catch(() => load());
    }

    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead(userId);
    await load();
  };

  if (!user) return null;

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell__panel">
          <div className="notification-bell__header">
            <strong>Notifications</strong>

            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <PushRow userId={user.id} />

          {notifications.length === 0 ? (
            <p className="notification-bell__empty">
              No notifications yet.
            </p>
          ) : (
            <div className="notification-bell__list">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    className={`notification-bell__item ${
                      notification.is_read ? "" : "unread"
                    } ${link ? "clickable" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <strong>{notification.title}</strong>
                    <span>
                      <NotificationMessage text={notification.message} />
                    </span>
                    <small>
                      {formatRelativeDate(notification.created_at)}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;