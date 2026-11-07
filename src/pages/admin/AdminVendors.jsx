import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import VendorService from "../../services/vendorService";
import { formatDate } from "../../utils/formatters";

const FILTERS = ["pending", "active", "all"];

function AdminVendors() {
  const [filter, setFilter] = useState("pending");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async (status) => {
    try {
      setLoading(true);
      setError(null);
      const data = await VendorService.getVendors(
        status === "all" ? null : status
      );
      setVendors(data);
    } catch (err) {
      setError(err.message || "Failed to load vendors.");
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
        await VendorService.approveVendor(id);
      } else if (action === "reject") {
        await VendorService.rejectVendor(id);
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
          <h1>Vendors</h1>
          <p>Review and manage vendor accounts.</p>
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
        <p>Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <div className="empty-state">
          <h3>No vendors here</h3>
          <p>Nothing matches this filter yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td>{vendor.business_name}</td>
                <td>{vendor.location || "—"}</td>
                <td>{vendor.phone || "—"}</td>
                <td>
                  <span
                    className={`status-badge status-badge--${
                      vendor.is_active ? "approved" : "pending"
                    }`}
                  >
                    {vendor.is_active ? "Live" : "Pending"}
                  </span>
                </td>
                <td>{formatDate(vendor.created_at)}</td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={
                        busyId === vendor.id || vendor.is_active
                      }
                      onClick={() => handleAction(vendor.id, "approve")}
                      title="Approve"
                    >
                      <Check size={16} />
                    </button>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={
                        busyId === vendor.id || !vendor.is_active
                      }
                      onClick={() => handleAction(vendor.id, "reject")}
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

export default AdminVendors;
