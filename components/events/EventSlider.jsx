import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventCard from "./EventCard";
import EmptyState from "../common/EmptyState";

function EventSlider({
  events = [],
  title = "Campus events",
  subtitle = "WHAT'S HAPPENING",
  autoPlay = true,
  autoPlayInterval = 4000,
}) {
  const sliderRef = useRef(null);
  const isHovering = useRef(false);

  const scrollSlider = (direction) => {
    if (!sliderRef.current) return;

    const slider = sliderRef.current;

    const firstCard =
      slider.querySelector(".event-slider__item");

    const cardWidth =
      firstCard?.offsetWidth || 350;

    const gap = 24;

    const atEnd =
      slider.scrollLeft + slider.clientWidth >=
      slider.scrollWidth - 4;

    if (direction === "next" && atEnd) {
      slider.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    slider.scrollBy({
      left:
        direction === "next"
          ? cardWidth + gap
          : -(cardWidth + gap),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!autoPlay || events.length < 2) return undefined;

    const intervalId = setInterval(() => {
      if (!isHovering.current) {
        scrollSlider("next");
      }
    }, autoPlayInterval);

    return () => clearInterval(intervalId);
  }, [autoPlay, autoPlayInterval, events.length]);

  if (!events.length) {
    return (
      <section className="event-slider-section">
        <div className="event-slider-section__header">
          <div>
            <span className="eyebrow">
              {subtitle}
            </span>

            <h2>{title}</h2>
          </div>
        </div>

        <EmptyState
          title="No events available"
          message="Check back soon for events happening around Makerere University."
        />
      </section>
    );
  }

  return (
    <section className="event-slider-section">
      <div className="event-slider-section__header">
        <div>
          <span className="eyebrow">
            {subtitle}
          </span>

          <h2>{title}</h2>
        </div>

        <div className="event-slider__controls">
          <button
            type="button"
            onClick={() => scrollSlider("previous")}
            aria-label="Previous events"
          >
            <ChevronLeft size={21} />
          </button>

          <button
            type="button"
            onClick={() => scrollSlider("next")}
            aria-label="Next events"
          >
            <ChevronRight size={21} />
          </button>
        </div>
      </div>

      <div
        className="event-slider"
        ref={sliderRef}
        onMouseEnter={() => {
          isHovering.current = true;
        }}
        onMouseLeave={() => {
          isHovering.current = false;
        }}
      >
        {events.map((event) => (
          <div
            className="event-slider__item"
            key={event.id}
          >
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default EventSlider;