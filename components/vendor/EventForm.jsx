import { useState } from "react";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
import ImageUploadField from "../common/ImageUploadField";

function toDateTimeLocal(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const initialForm = {
  title: "",
  description: "",
  start_time: "",
  end_time: "",
  location: "",
  image_url: "",
  contact_whatsapp: "",
  ticket_price: "",
  booking_deadline: "",
};

function EventForm({
  initialData = null,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState(
    initialData
      ? {
          title: initialData.title || "",
          description: initialData.description || "",
          start_time: toDateTimeLocal(initialData.start_time),
          end_time: toDateTimeLocal(initialData.end_time),
          location: initialData.location || "",
          image_url: initialData.image_url || "",
          contact_whatsapp: initialData.contact_whatsapp || "",
          ticket_price: initialData.ticket_price ?? "",
          booking_deadline: toDateTimeLocal(
            initialData.booking_deadline
          ),
        }
      : initialForm
  );

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }

    if (!form.location.trim()) {
      setError("Event location is required.");
      return;
    }

    if (!form.start_time) {
      setError("Event start date/time is required.");
      return;
    }

    if (
      form.end_time &&
      new Date(form.end_time) <= new Date(form.start_time)
    ) {
      setError("End time must be after the start time.");
      return;
    }

    if (
      form.booking_deadline &&
      new Date(form.booking_deadline) > new Date(form.start_time)
    ) {
      setError("Booking deadline should be before the event starts.");
      return;
    }

    try {
      await onSubmit?.({
        title: form.title,
        description: form.description,
        location: form.location,
        image_url: form.image_url,
        contact_whatsapp: form.contact_whatsapp,
        ticket_price: form.ticket_price
          ? Number(form.ticket_price)
          : null,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time
          ? new Date(form.end_time).toISOString()
          : null,
        booking_deadline: form.booking_deadline
          ? new Date(form.booking_deadline).toISOString()
          : null,
      });

      if (!initialData) {
        setForm(initialForm);
      }
    } catch (err) {
      setError(
        err.message || "Unable to save event."
      );
    }
  };

  return (
    <form
      className="vendor-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError("")}
        />
      )}

      <div className="form-group">
        <label htmlFor="title">
          Event title
        </label>

        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Enter event title"
        />
      </div>

      <div className="form-group">
        <label htmlFor="start_time">
          Starts
        </label>

        <input
          id="start_time"
          name="start_time"
          type="datetime-local"
          value={form.start_time}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="end_time">
          Ends (optional)
        </label>

        <input
          id="end_time"
          name="end_time"
          type="datetime-local"
          value={form.end_time}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="booking_deadline">
          Booking deadline (optional)
        </label>

        <input
          id="booking_deadline"
          name="booking_deadline"
          type="datetime-local"
          value={form.booking_deadline}
          onChange={handleChange}
        />

        <p className="field-hint">
          Last date/time people can book a spot. Leave blank if there's no cutoff.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="location">
          Location
        </label>

        <input
          id="location"
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="Event location"
        />
      </div>

      <div className="form-group">
        <label htmlFor="ticket_price">
          Ticket price (UGX, optional)
        </label>

        <input
          id="ticket_price"
          name="ticket_price"
          type="number"
          min="0"
          value={form.ticket_price}
          onChange={handleChange}
          placeholder="Leave blank if free"
        />
      </div>

      <div className="form-group">
        <label htmlFor="contact_whatsapp">
          Contact WhatsApp number
        </label>

        <input
          id="contact_whatsapp"
          name="contact_whatsapp"
          value={form.contact_whatsapp}
          onChange={handleChange}
          placeholder="e.g. 0771234567"
        />

        <p className="field-hint">
          Shown as a "Chat on WhatsApp" button on the event page.
        </p>
      </div>

      <ImageUploadField
        bucket="event-images"
        value={form.image_url}
        onChange={(url) =>
          setForm((current) => ({
            ...current,
            image_url: url,
          }))
        }
        label="Banner image"
      />

      <div className="form-group">
        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows="5"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe your event..."
        />
      </div>

      <Button
        type="submit"
        loading={loading}
      >
        {initialData
          ? "Update Event"
          : "Create Event"}
      </Button>
    </form>
  );
}

export default EventForm;