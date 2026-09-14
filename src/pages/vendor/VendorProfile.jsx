import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

function VendorProfile() {
  const {
    vendor,
    refreshProfile,
  } = useAuth();

  const [form, setForm] = useState({
    business_name: vendor?.business_name || "",
    phone: vendor?.phone || "",
    location: vendor?.location || "Main Campus",
    description: vendor?.description || "",
  });

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!vendor) {
      setError("Vendor profile not found.");
      return;
    }

    const { error: updateError } = await supabase
      .from("vendors")
      .update(form)
      .eq("id", vendor.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();

    setMessage(
      "Store profile updated successfully."
    );
  };

  if (!vendor) {
    return (
      <div className="empty-state">
        <h3>Vendor account not found</h3>
        <p>
          Your vendor profile isn't set up yet. Please
          contact support.
        </p>
      </div>
    );
  }

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <span className="eyebrow">
          STORE SETTINGS
        </span>

        <h1>Store Profile</h1>
      </div>

      {message && (
        <div className="form-success">
          {message}
        </div>
      )}

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <form
        className="vendor-form"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label>Business name</label>

          <input
            value={form.business_name}
            onChange={(event) =>
              setForm({
                ...form,
                business_name: event.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>WhatsApp / phone number</label>

          <input
            value={form.phone}
            onChange={(event) =>
              setForm({
                ...form,
                phone: event.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Campus / location</label>

          <input
            value={form.location}
            onChange={(event) =>
              setForm({
                ...form,
                location: event.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <textarea
            rows="4"
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
          />
        </div>

        <button
          className="primary-button"
          type="submit"
        >
          Save Changes
        </button>
      </form>
    </section>
  );
}

export default VendorProfile;
