import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import MessageService from "../../services/messageService";

// "Danger zone": permanently deletes the signed-in person's account.
function DeleteAccountCard() {
  const { vendor, serviceProvider, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isAdmin) return null;

  const what = vendor && serviceProvider
    ? "your store, products, services, events"
    : vendor
    ? "your store, products and events"
    : serviceProvider
    ? "your services profile and services"
    : "your profile, orders and saved items";

  const handleDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await MessageService.deleteMyAccount("DELETE");
      // Go home first so the dashboard doesn't bounce us to the login page.
      navigate("/", { replace: true });
      try {
        await signOut();
      } catch {
        /* the account is already gone; local sign-out is best effort */
      }
    } catch (err) {
      setError(err.message || "Could not delete your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="danger-zone">
      <h2>Delete my account</h2>
      <p>
        This permanently deletes {what}, along with your messages and notifications. People with open
        orders or requests with you are told. It can't be undone.
      </p>

      {!open ? (
        <button type="button" className="danger-button" onClick={() => setOpen(true)}>
          <Trash2 size={17} /> Delete my account…
        </button>
      ) : (
        <div className="danger-zone__confirm">
          {error && <div className="form-error">{error}</div>}
          <label htmlFor="delete-confirm">Type <strong>DELETE</strong> to confirm</label>
          <input
            id="delete-confirm"
            value={text}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="danger-zone__actions">
            <button type="button" className="danger-button" disabled={busy || text !== "DELETE"} onClick={handleDelete}>
              {busy ? "Deleting..." : "Permanently delete"}
            </button>
            <button type="button" className="secondary-button" disabled={busy} onClick={() => { setOpen(false); setText(""); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeleteAccountCard;