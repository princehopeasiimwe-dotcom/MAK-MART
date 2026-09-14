import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import useEvents from "../../hooks/useEvents";
import Loader from "../../components/common/loader";

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
          {event.start_time
            ? new Date(
                event.start_time
              ).toLocaleString()
            : "Date TBA"}
        </span>
      </div>
    </section>
  );
}

export default EventDetails;