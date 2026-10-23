import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

import { formatDateTime } from "../../utils/formatters";

const AUTO_MS = 5000;
const MAX_SLIDES = 8;

function isUpcoming(event) {
  if (event.is_active === false) return false;
  const end = event.end_time || event.start_time;
  if (!end) return true;
  return new Date(end).getTime() >= Date.now();
}

function EventsCarousel({ events = [], loading = false }) {
  const trackRef = useRef(null);
  const paused = useRef(false);
  const [index, setIndex] = useState(0);

  const slides = useMemo(
    () => events.filter(isUpcoming).slice(0, MAX_SLIDES),
    [events]
  );

  const count = slides.length;

  const goTo = useCallback((target) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    track.scrollTo({ left: target * width, behavior: "smooth" });
  }, []);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  useEffect(() => {
    if (count < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const id = setInterval(() => {
      if (paused.current) return;
      const track = trackRef.current;
      if (!track) return;
      const current = Math.round(track.scrollLeft / track.clientWidth);
      goTo(current + 1 >= count ? 0 : current + 1);
    }, AUTO_MS);

    return () => clearInterval(id);
  }, [count, goTo]);

  if (loading) {
    return (
      <section className="mm-banner mm-container" aria-hidden="true">
        <div className="mm-banner__frame mm-banner__frame--loading" />
      </section>
    );
  }

  // Nothing upcoming: show one friendly welcome slide instead of a blank gap.
  if (count === 0) {
    return (
      <section className="mm-banner mm-container" aria-label="Welcome">
        <div className="mm-banner__frame">
          <div className="mm-banner__slide mm-banner__slide--welcome">
            <div className="mm-banner__text">
              <span className="mm-banner__pill">MAK MART</span>
              <h2>Shop student businesses on campus</h2>
              <Link to="/marketplace/products" className="mm-banner__cta">
                Explore marketplace <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mm-banner mm-container" aria-label="Upcoming events">
      <div
        className="mm-banner__frame"
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
        onTouchStart={() => {
          paused.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            paused.current = false;
          }, 4000);
        }}
      >
        <div className="mm-banner__track" ref={trackRef} onScroll={handleScroll}>
          {slides.map((event) => (
            <Link
              key={event.id}
              to={`/marketplace/events/${event.id}`}
              className="mm-banner__slide"
            >
              {event.image_url ? (
                <img src={event.image_url} alt="" loading="lazy" />
              ) : (
                <span className="mm-banner__noimg" aria-hidden="true">
                  <CalendarDays size={56} />
                </span>
              )}
              <span className="mm-banner__shade" aria-hidden="true" />
              <span className="mm-banner__text">
                <span className="mm-banner__pill">
                  <CalendarDays size={13} />
                  {event.start_time ? formatDateTime(event.start_time) : "Coming soon"}
                </span>
                <strong className="mm-banner__title">{event.title}</strong>
                <span className="mm-banner__where">
                  <MapPin size={14} />
                  {event.location || "Makerere University"}
                </span>
                <span className="mm-banner__cta">
                  View event <ArrowRight size={16} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mm-banner__dots" role="tablist" aria-label="Choose event">
          {slides.map((event, i) => (
            <button
              key={event.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${event.title}`}
              className={i === index ? "is-active" : ""}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default EventsCarousel;