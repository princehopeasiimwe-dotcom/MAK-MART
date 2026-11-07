import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Flag } from "lucide-react";

import Modal from "./modal";
import useAuth from "../../hooks/useAuth";
import ReportService, { REPORT_REASONS } from "../../services/reportService";
import { rememberReturnTo } from "../../lib/returnTo";

// A small "Report" link. type: "product" | "service" | "vendor" | "provider"
function ReportButton({ type, id, label = "Report" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!id) return null;

  const start = () => {
    if (!user) {
      const from = `${location.pathname}${location.search}`;
      rememberReturnTo(from);
      navigate("/login", { state: { from } });
      return;
    }
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setReason("");
    setDetails("");
    setError("");
    setDone(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!reason) {
      setError("Please choose a reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ReportService.report(type, id, reason, details.trim());
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not send your report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="report-link" onClick={start}>
        <Flag size={14} aria-hidden="true" /> {label}
      </button>

      <Modal isOpen={open} onClose={close} title="Report this listing">
        {done ? (
          <div className="report-done">
            <p>
              <strong>Thank you.</strong> Our team will look into it. We will let you know what we decide.
            </p>
            <button type="button" className="primary-button full-width" onClick={close}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="report-form">
            <fieldset>
              <legend>What is wrong?</legend>
              {REPORT_REASONS.map((item) => (
                <label key={item.value} className="report-form__option">
                  <input
                    type="radio"
                    name="report-reason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>

            <div className="form-group">
              <label htmlFor="report-details">More details (optional)</label>
              <textarea
                id="report-details"
                rows="3"
                maxLength={600}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Tell us what happened"
              />
            </div>

            {error && <div className="form-error" role="alert">{error}</div>}

            <button type="submit" className="primary-button full-width" disabled={busy}>
              {busy ? "Sending..." : "Send report"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}

export default ReportButton;