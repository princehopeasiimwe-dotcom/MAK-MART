import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import ServiceService from "../../services/services";
import { formatDate } from "../../utils/formatters";

const FILTERS = ["pending", "active", "all"];

function AdminServices() {
  const [filter, setFilter] = useState("pending");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async (status) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ServiceService.getAllProviders(
        status === "all" ? null : status
      );
      setProviders(data);
    } catch (err) {
      setError(err.message || "Failed to load service providers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const handleAction = async (id, action) => {
    setBusyId(id);
    try {
      if (action === "approve") {
        await ServiceService.approveProvider(id);
      } else {
        await ServiceService.rejectProvider(id);
      }
      await load(filter);
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Services</h1>
          <p>Review student service providers.</p>
        </div>
      </div>

      <div className="service-category-filters">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`service-category-chip ${
              filter === status ? "active" : ""
            }`}
            onClick={() => setFilter(status)}
          >
            {status === "pending"
              ? "Awaiting approval"
              : status === "active"
              ? "Live"
              : "All"}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading providers...</p>
      ) : providers.length === 0 ? (
        <div className="empty-state">
          <h3>No providers here</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td>{provider.business_name}</td>
                <td>{provider.location || "—"}</td>
                <td>{provider.phone || "—"}</td>
                <td>
                  <span
                    className={`status-badge status-badge--${
                      provider.is_active ? "approved" : "pending"
                    }`}
                  >
                    {provider.is_active ? "Live" : "Pending"}
                  </span>
                </td>
                <td>{formatDate(provider.created_at)}</td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={
                        busyId === provider.id || provider.is_active
                      }
                      onClick={() => handleAction(provider.id, "approve")}
                      title="Approve"
                    >
                      <Check size={16} />
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={
                        busyId === provider.id || !provider.is_active
                      }
                      onClick={() => handleAction(provider.id, "reject")}
                      title="Suspend"
                    >
                      <X size={16} />
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

export default AdminServices;
