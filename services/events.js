import EventService from "./eventService";

export const getEvents = EventService.getEvents;
export const getEventById = EventService.getEventById;
export const getFeaturedEvents = EventService.getFeaturedEvents;
export const createEvent = EventService.createEvent;
export const updateEvent = EventService.updateEvent;
export const deleteEvent = EventService.deleteEvent;

export default EventService;