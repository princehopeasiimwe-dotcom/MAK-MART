import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import useEvents from "../../hooks/useEvents";
import EventForm from "../../components/vendor/EventForm";
import Modal from "../../components/common/modal";

// Ended = past its end time (or 24h after start when no end time was set)
function isEnded(event) {
  const end = event.end_time
    ? new Date(event.end_time)
    : new Date(new Date(event.start_time).getTime() + 24 * 60 * 60 * 1000);

  return end < new Date();
}

function VendorEvents() {
  const { user } = useAuth();

  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents({
    createdBy: user?.id,
  });

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const handleSubmit = async (data) => {
    if (selectedEvent) {
      await updateEvent(
        selectedEvent.id,
        data
      );
    } else {
      await createEvent({
        ...data,
        created_by: user.id,
      });
    }

    setModalOpen(false);
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            VENDOR EVENTS
          </span>

          <h1>My Events</h1>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setSelectedEvent(null);
            setModalOpen(true);
          }}
        >
          Create Event
        </button>
      </div>

      {loading ? (
        <p>Loading events...</p>
      ) : (
        <div className="event-management-list">
          {events.map((event) => (
            <article
              key={event.id}
              className="management-item"
            >
              <div>
                <h3>
                  {event.title}
                  {isEnded(event) && (
                    <span className="status-badge status-badge--ended">
                      {" "}Ended (hidden from the public)
                    </span>
                  )}
                </h3>
                <p>
                  {event.location || "No location"}
                </p>
              </div>

              <div className="management-actions">
                <button
                  onClick={() => {
                    setSelectedEvent(event);
                    setModalOpen(true);
                  }}
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    deleteEvent(event.id)
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedEvent
            ? "Edit Event"
            : "Create Event"
        }
      >
        <EventForm
          initialData={selectedEvent}
          onSubmit={handleSubmit}
        />
      </Modal>
    </section>
  );
}

export default VendorEvents;