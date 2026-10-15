import { useCallback, useEffect, useState } from "react";
import EventService from "../services/eventService";

function useEvents(options = {}) {
  const {
    createdBy = null,
    autoLoad = true,
  } = options;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await EventService.getEvents({
        createdBy,
      });

      setEvents(data || []);

      return data;
    } catch (err) {
      console.error("Failed to load events:", err);
      setError(err.message || "Failed to load events.");
      setEvents([]);

      return [];
    } finally {
      setLoading(false);
    }
  }, [createdBy]);

  useEffect(() => {
    if (autoLoad) {
      fetchEvents();
    }
  }, [autoLoad, fetchEvents]);

  const getEvent = async (id) => {
    try {
      setLoading(true);
      setError(null);

      return await EventService.getEventById(id);
    } catch (err) {
      console.error("Failed to load event:", err);
      setError(err.message || "Failed to load event.");

      return null;
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData) => {
    const newEvent =
      await EventService.createEvent(eventData);

    await fetchEvents();

    return newEvent;
  };

  const updateEvent = async (id, updates) => {
    const updatedEvent =
      await EventService.updateEvent(id, updates);

    await fetchEvents();

    return updatedEvent;
  };

  const deleteEvent = async (id) => {
    await EventService.deleteEvent(id);

    setEvents((current) =>
      current.filter((event) => event.id !== id)
    );
  };

  return {
    events,
    loading,
    error,

    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

export default useEvents;