import { useEffect, useState } from "react";
import Modal from "../common/modal";
import ErrorMessage from "../common/ErrorMessage";
import useAuth from "../../hooks/useAuth";
import RatingService from "../../services/ratingService";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp } from "../../lib/whatsapp";

// Signed-in customer asks for a service: we record the request (so it can be
// tracked, confirmed and rated), then open WhatsApp to chat with the provider.
function ServiceRequestModal({ service, provider, isOpen, onClose }) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName((c) => c || profile?.full_name || "");
    setPhone((c) => c || profile?.phone || "");
  }, [isOpen, profile?.full_name, profile?.phone]);

  if (!service) return null;

  const handleClose = () => {
    setLocation("");
    setNotes("");
    setError("");
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) return setError("Please enter your name.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!provider?.phone) return setError("This provider has no contact number on file yet.");

    setSubmitting(true);
    try {
      await RatingService.requestService({
        serviceId: service.id,
        notes: notes.trim(),
        location: location.trim(),
      });

      openWhatsApp(
        provider.phone,
        `Hello ${provider.business_name || ""}, I'd like to request a service on MAK MART.

Service: ${service.name}${service.price != null ? `\nPrice: ${formatCurrency(service.price)}` : ""}

Name: ${name.trim()}
Phone: ${phone.trim()}${location.trim() ? `\nWhere: ${location.trim()}` : ""}${notes.trim() ? `\nDetails: ${notes.trim()}` : ""}`
      );

      handleClose();
    } catch (err) {
      setError(err.message || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request this service">
      <div className="order-modal__product">
        <div>
          <strong>{service.name}</strong>
          <span>{service.price != null ? formatCurrency(service.price) : "Price agreed with the provider"}</span>
        </div>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError("")} />}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sr-name">Your name</label>
          <input id="sr-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="sr-phone">Your phone number</label>
          <input id="sr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="sr-location">Where / when <small>(optional)</small></label>
          <input id="sr-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Library, tomorrow 3pm" />
        </div>
        <div className="form-group">
          <label htmlFor="sr-notes">Details <small>(optional)</small></label>
          <textarea id="sr-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? "Sending..." : "Continue on WhatsApp"}
        </button>
      </form>
    </Modal>
  );
}

export default ServiceRequestModal;