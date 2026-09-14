import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import NotificationService from "../../services/notificationService";
import useAuth from "../../hooks/useAuth";
import { formatRelativeDate } from "../../utils/formatters";

function NotificationBell() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  const load = async () => {
    if (!user?.id) return;

    const [list, count] = await Promise.all([
      NotificationService.getNotifications(user.id),
      NotificationService.getUnreadCount(user.id),
    ]);

    setNotifications(list);
    setUnreadCount(count);
  };

  useEffect(() => {
    load();

    // Light polling - good enough for a campus-scale app without
    // needing to stand up realtime subscriptions.
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
    if (!notification.is_read) {
      await NotificationService.markAsRead(notification.id);
      await load();
    }
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead(user.id);
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

          {notifications.length === 0 ? (
            <p className="notification-bell__empty">
              No notifications yet.
            </p>
          ) : (
            <div className="notification-bell__list">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-bell__item ${
                    notification.is_read ? "" : "unread"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <small>
                    {formatRelativeDate(notification.created_at)}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;