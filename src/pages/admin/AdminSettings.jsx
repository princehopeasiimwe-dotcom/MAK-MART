import { useEffect, useState } from "react";
import SettingsService from "../../services/settingsService";

function AdminSettings() {
  const [groupLink, setGroupLink] = useState("");
  const [digestMin, setDigestMin] = useState("10");
  const [requireApproval, setRequireApproval] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      SettingsService.getSetting("vendor_whatsapp_group_link"),
      SettingsService.getSetting("digest_min_views"),
      SettingsService.getSetting("reviews_require_approval"),
    ])
      .then(([link, min, approval]) => {
        setGroupLink(link);
        if (min) setDigestMin(min);
        setRequireApproval(approval !== "false");
      })
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
      const min = Math.max(1, parseInt(digestMin, 10) || 10);
      await SettingsService.updateSetting("digest_min_views", String(min));
      setDigestMin(String(min));
      await SettingsService.updateSetting(
        "reviews_require_approval",
        requireApproval ? "true" : "false"
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

          <div className="form-group">
            <label htmlFor="digest-min">Daily vendor report threshold (product views)</label>
            <input
              id="digest-min"
              type="number"
              min="1"
              value={digestMin}
              onChange={(event) => setDigestMin(event.target.value)}
            />
            <p className="field-hint">
              A vendor is notified the next morning (“5 people viewed your products”) when
              their products got at least this many views in a day. Every day is stored for the monthly audit
              regardless.
            </p>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(event) => setRequireApproval(event.target.checked)}
              />{" "}
              Approve buyer reviews before they count
            </label>
            <p className="field-hint">
              When on, new ratings wait on the Reviews page until you approve them. Turn off to publish instantly.
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