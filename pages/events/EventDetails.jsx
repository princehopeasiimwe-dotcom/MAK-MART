import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Ticket, MessageCircle } from "lucide-react";
import useEvents from "../../hooks/useEvents";
import Loader from "../../components/common/loader";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp } from "../../lib/whatsapp";

function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const { getEvent, loading } =
    useEvents({ autoLoad: false });

  const [event, setEvent] =
    useState(null);

  useEffect(() => {
    getEvent(eventId).then(setEvent);
  }, [eventId]);

  if (loading) {
    return <Loader message="Loading event..." />;
  }

  if (!event) return null;

  const bookingClosed =
    event.booking_deadline &&
    new Date(event.booking_deadline) < new Date();

  const handleContact = () => {
    if (!event.contact_whatsapp) return;

    openWhatsApp(
      event.contact_whatsapp,
      `Hi, I'd like to know more about "${event.title}" on MAK MART.`
    );
  };

  return (
    <section className="page event-details-page">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {event.image_url && (
        <img
          className="event-banner"
          src={event.image_url}
          alt={event.title}
        />
      )}

      <span className="eyebrow">
        EVENT
      </span>

      <h1>{event.title}</h1>

      <p>
        {event.description}
      </p>

      <div className="event-details-meta">
        <span>
          <MapPin size={18} />
          {event.location || "Location TBA"}
        </span>

        <span>
          <Clock size={16} />
          {event.start_time
            ? new Date(
                event.start_time
              ).toLocaleString()
            : "Date TBA"}
        </span>

        <span>
          <Ticket size={16} />
          {event.ticket_price != null
            ? formatCurrency(event.ticket_price)
            : "Free entry"}
        </span>
      </div>

      {event.booking_deadline && (
        <div className={`active-filter ${bookingClosed ? "active-filter--closed" : ""}`}>
          {bookingClosed
            ? "Booking has closed for this event."
            : `Book before ${new Date(event.booking_deadline).toLocaleString()}`}
        </div>
      )}

      {event.contact_whatsapp && !bookingClosed && (
        <button
          type="button"
          className="primary-button"
          onClick={handleContact}
        >
          <MessageCircle size={18} />
          Chat on WhatsApp to book
        </button>
      )}
    </section>
  );
}

export default EventDetails;