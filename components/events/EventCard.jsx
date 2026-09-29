import { CalendarDays, MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/formatters";

function EventCard({ event }) {
  if (!event) return null;

  const eventId = event.id;
  const eventTitle = event.title || "Untitled Event";
  const eventImage = event.image_url || null;

  const eventDate = event.start_time
    ? formatDate(event.start_time)
    : "Date to be announced";

  const eventLocation =
    event.location ||
    "Makerere University";

  const eventCategory =
    event.category ||
    "Campus Event";

  return (
    <Link
      to={`/marketplace/events/${eventId}`}
      className="event-card"
    >
      <div className="event-card__image">
        {eventImage ? (
          <img
            src={eventImage}
            alt={eventTitle}
            loading="lazy"
          />
        ) : (
          <div className="event-card__placeholder">
            <CalendarDays size={38} />
          </div>
        )}

        <span className="event-card__category">
          {eventCategory}
        </span>

        <div className="event-card__open">
          <ArrowUpRight size={19} />
        </div>
      </div>

      <div className="event-card__content">
        <div className="event-card__meta">
          <span>
            <CalendarDays size={15} />
            {eventDate}
          </span>

          <span>
            <MapPin size={15} />
            {eventLocation}
          </span>
        </div>

        <h3>{eventTitle}</h3>

        {event.description && (
          <p>
            {event.description}
          </p>
        )}

        <span className="event-card__link">
          View event
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default EventCard;