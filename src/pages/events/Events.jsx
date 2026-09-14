import useEvents from "../../hooks/useEvents";
import EventCard from "../../components/events/EventCard";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";

function Events() {
  const {
    events,
    loading,
  } = useEvents();

  if (loading) {
    return <Loader message="Loading events..." />;
  }

  return (
    <section className="page">
      <div className="page-header">
        <span className="eyebrow">
          MAKERERE COMMUNITY
        </span>

        <h1>Campus Events</h1>
      </div>

      {!events.length ? (
        <EmptyState
          title="No events available"
          message="New events will appear here."
        />
      ) : (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Events;