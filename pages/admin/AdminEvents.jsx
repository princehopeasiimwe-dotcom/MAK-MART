import { useEffect, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";

import EventService from "../../services/eventService";
import { formatDate } from "../../utils/formatters";

const FILTERS = ["active", "inactive", "all"];

function AdminEvents() {
  const [filter, setFilter] = useState("all");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await EventService.getEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || "Failed to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleEvents =
    filter === "all"
      ? events
      : events.filter((event) =>
          filter === "active"
            ? event.is_active
            : !event.is_active
        );

  const handleAction = async (id, action) => {
    setBusyId(id);
    try {
      if (action === "approve") {
        await EventService.approveEvent(id);
        await load();
      } else if (action === "reject") {
        await EventService.rejectEvent(id);
        await load();
      } else if (action === "delete") {
        const confirmed = window.confirm(
          "Delete this event permanently?"
        );
        if (confirmed) {
          await EventService.deleteEvent(id);
          await load();
        }
      }
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Events</h1>
          <p>Approve or take down campus event submissions.</p>
        </div>
      </div>

      <div className="service-category-filters">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`service-category-chip ${
              filter === status ? "active" : ""
            }`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading events...</p>
      ) : visibleEvents.length === 0 ? (
        <div className="empty-state">
          <h3>No events here</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Location</th>
              <th>Starts</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>{event.location}</td>
                <td>{formatDate(event.start_time)}</td>
                <td>
                  <span
                    className={`status-badge status-badge--${
                      event.is_active ? "approved" : "rejected"
                    }`}
                  >
                    {event.is_active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={busyId === event.id || event.is_active}
                      onClick={() => handleAction(event.id, "approve")}
                      title="Make active"
                    >
                      <Check size={16} />
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={
                        busyId === event.id || !event.is_active
                      }
                      onClick={() => handleAction(event.id, "reject")}
                      title="Hide"
                    >
                      <X size={16} />
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={busyId === event.id}
                      onClick={() => handleAction(event.id, "delete")}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminEvents;
