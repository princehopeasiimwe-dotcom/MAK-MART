-- =========================================================
-- MIGRATION: event contact/ticket details
-- Adds a WhatsApp contact number, optional ticket price, and
-- an optional booking deadline to events, so event pages can
-- show these details and offer a click-to-chat WhatsApp link.
-- =========================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS ticket_price NUMERIC(12,2) CHECK (ticket_price IS NULL OR ticket_price >= 0),
  ADD COLUMN IF NOT EXISTS booking_deadline TIMESTAMPTZ;

SELECT 'Event contact/ticket columns added successfully!' AS message;