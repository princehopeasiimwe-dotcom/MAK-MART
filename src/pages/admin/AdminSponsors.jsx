import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import SponsorService from "../../services/sponsorService";
import ImageUploadField from "../../components/common/ImageUploadField";

const EMPTY = { name: "", link_url: "", logo_url: "" };

function AdminSponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSponsors(await SponsorService.getAll());
    } catch (err) {
      setError(
        err.message?.includes("sponsors")
          ? "The sponsors table is missing. Run migration 023 in Supabase first."
          : err.message || "Could not load sponsors."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Enter the sponsor's name.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const last = sponsors.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
      await SponsorService.create({
        name: form.name.trim(),
        link_url: form.link_url.trim() || null,
        logo_url: form.logo_url || null,
        sort_order: last + 1,
        is_active: true,
      });
      setForm(EMPTY);
      setNotice("Sponsor added. It now shows on the home page.");
      await load();
    } catch (err) {
      setError(err.message || "Could not add the sponsor.");
    } finally {
      setSaving(false);
    }
  };

  const run = async (id, action, success) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await load();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (sponsor) =>
    run(
      sponsor.id,
      () => SponsorService.update(sponsor.id, { is_active: !sponsor.is_active }),
      sponsor.is_active ? "Sponsor hidden from the home page." : "Sponsor is live again."
    );

  const remove = (sponsor) => {
    if (!window.confirm(`Delete ${sponsor.name} permanently?`)) return;
    run(sponsor.id, () => SponsorService.remove(sponsor.id), "Sponsor deleted.");
  };

  // Swap positions with the neighbour above (-1) or below (+1)
  const move = (index, step) => {
    const a = sponsors[index];
    const b = sponsors[index + step];
    if (!a || !b) return;
    // Give them distinct values even if they started equal
    const aOrder = index + step;
    const bOrder = index;
    run(a.id, async () => {
      await SponsorService.update(a.id, { sort_order: aOrder });
      await SponsorService.update(b.id, { sort_order: bOrder });
    });
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Sponsors</h1>
          <p>
            Sponsors slide across the home page, just under the events banner.
            Add a logo (or just a name), and optionally a link people open when
            they tap it.
          </p>
        </div>
      </div>

      {notice && <p className="form-success">{notice}</p>}
      {error && <p className="form-error">{error}</p>}

      <form
        onSubmit={handleAdd}
        style={{ display: "grid", gap: 14, maxWidth: 460, marginBottom: 28 }}
      >
        <h3>Add a sponsor</h3>

        <div className="form-group">
          <label htmlFor="sp-name">Sponsor name *</label>
          <input
            id="sp-name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="e.g. MTN Uganda"
          />
        </div>

        <ImageUploadField
          bucket="vendor-images"
          label="Logo (recommended: wide, transparent background)"
          value={form.logo_url}
          onChange={(url) => setField("logo_url", url)}
        />

        <div className="form-group">
          <label htmlFor="sp-link">Website link (optional)</label>
          <input
            id="sp-link"
            value={form.link_url}
            onChange={(event) => setField("link_url", event.target.value)}
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          className="primary-button"
          disabled={saving}
          style={{ width: "auto", padding: "10px 22px", justifySelf: "start" }}
        >
          {saving ? "Adding..." : "Add sponsor"}
        </button>
      </form>

      {loading ? (
        <p>Loading sponsors...</p>
      ) : sponsors.length === 0 ? (
        <div className="empty-state">
          <h3>No sponsors yet</h3>
          <p>The ribbon stays hidden on the home page until you add one.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Name</th>
              <th>Link</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.map((sponsor, i) => (
              <tr key={sponsor.id}>
                <td>
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt=""
                      style={{ height: 32, maxWidth: 110, objectFit: "contain" }}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{sponsor.name}</td>
                <td>{sponsor.link_url || "—"}</td>
                <td>
                  <span
                    className={`status-badge status-badge--${
                      sponsor.is_active ? "approved" : "archived"
                    }`}
                  >
                    {sponsor.is_active ? "Showing" : "Hidden"}
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={busyId === sponsor.id || i === 0}
                      onClick={() => move(i, -1)}
                      title="Move earlier"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === sponsor.id || i === sponsors.length - 1}
                      onClick={() => move(i, 1)}
                      title="Move later"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === sponsor.id}
                      onClick={() => toggle(sponsor)}
                      title={sponsor.is_active ? "Hide" : "Show"}
                    >
                      {sponsor.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busyId === sponsor.id}
                      onClick={() => remove(sponsor)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminSponsors;