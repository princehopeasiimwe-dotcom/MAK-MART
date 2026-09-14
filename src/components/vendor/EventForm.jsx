import { useState } from "react";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";

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

    try {
      await onSubmit?.({
        title: form.title,
        description: form.description,
        location: form.location,
        image_url: form.image_url,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time
          ? new Date(form.end_time).toISOString()
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
        <label htmlFor="image_url">
          Banner image URL
        </label>

        <input
          id="image_url"
          name="image_url"
          type="url"
          value={form.image_url}
          onChange={handleChange}
          placeholder="https://..."
        />
      </div>

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
