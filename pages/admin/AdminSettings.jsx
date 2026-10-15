import { useEffect, useState } from "react";
import SettingsService from "../../services/settingsService";

function AdminSettings() {
  const [groupLink, setGroupLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    SettingsService.getSetting("vendor_whatsapp_group_link")
      .then(setGroupLink)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await SettingsService.updateSetting(
        "vendor_whatsapp_group_link",
        groupLink.trim()
      );
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Settings</h1>
          <p>Platform-wide configuration.</p>
        </div>
      </div>

      {loading ? (
        <p>Loading settings...</p>
      ) : (
        <form className="vendor-form" onSubmit={handleSubmit}>
          {message && <div className="form-success">{message}</div>}
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="group-link">
              Vendor WhatsApp community group link
            </label>

            <input
              id="group-link"
              type="url"
              value={groupLink}
              onChange={(event) => setGroupLink(event.target.value)}
              placeholder="https://chat.whatsapp.com/DEgbb5EtxjH3UczYQ1Hlkj"
            />

            <p className="field-hint">
              Sent automatically to vendors and service providers the
              moment they're approved. Create the group in WhatsApp,
              then paste its invite link here (Group info → Invite via link).
            </p>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      )}
    </section>
  );
}

export default AdminSettings;