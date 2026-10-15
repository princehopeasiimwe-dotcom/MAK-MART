import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import ImageUploadField from "../../components/common/ImageUploadField";
import ServiceService from "../../services/services";

function ProviderAccount() {
  const { serviceProvider, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    business_name: serviceProvider?.business_name || "",
    phone: serviceProvider?.phone || "",
    location: serviceProvider?.location || "",
    description: serviceProvider?.description || "",
    profile_image_url: serviceProvider?.profile_image_url || "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!serviceProvider) {
      setError("Service provider profile not found.");
      return;
    }

    try {
      await ServiceService.updateProvider(serviceProvider.id, form);
      await refreshProfile();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message || "Could not update your profile.");
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Provider profile</h1>
        </div>
      </div>

      {message && <div className="form-success">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <ImageUploadField
          bucket="vendor-images"
          label="Profile icon / photo"
          value={form.profile_image_url}
          onChange={(url) => setForm((f) => ({ ...f, profile_image_url: url }))}
        />
        <div className="form-group">
          <label htmlFor="pa-name">Business name</label>
          <input id="pa-name" name="business_name" value={form.business_name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="pa-phone">WhatsApp / phone</label>
          <input id="pa-phone" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="pa-location">Location</label>
          <input id="pa-location" name="location" value={form.location} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label htmlFor="pa-desc">Description</label>
          <textarea id="pa-desc" name="description" rows="4" value={form.description} onChange={handleChange} />
        </div>
        <button type="submit" className="primary-button">Save changes</button>
      </form>
    </section>
  );
}

export default ProviderAccount;