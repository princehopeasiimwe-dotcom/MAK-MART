import { useState } from "react";
import ImageUploadField from "../common/ImageUploadField";
import ErrorMessage from "../common/ErrorMessage";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  location: "",
  category_id: "",
  is_available: true,
  image_url: "",
};

function ServiceForm({
  initialData = null,
  categories = [],
  onSubmit,
}) {
  const [form, setForm] = useState(
    initialData
      ? {
          name: initialData.name || "",
          description: initialData.description || "",
          price: initialData.price ?? "",
          location: initialData.location || "",
          category_id: initialData.category_id || "",
          is_available: initialData.is_available ?? true,
          image_url: initialData.image_url || "",
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Service name is required.");
      return;
    }

    if (form.price !== "" && Number(form.price) < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price === "" ? null : Number(form.price),
        location: form.location.trim() || null,
        category_id: form.category_id || null,
        is_available: form.is_available,
        image_url: form.image_url || null,
      });
    } catch (err) {
      setError(err.message || "Could not save the service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorMessage message={error} onClose={() => setError("")} />

      <ImageUploadField
        bucket="vendor-images"
        label="Service photo (optional)"
        value={form.image_url}
        onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
      />

      <div className="form-group">
        <label htmlFor="svc-name">Service name</label>
        <input id="svc-name" name="name" value={form.name} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label htmlFor="svc-category">Category</label>
        <select id="svc-category" name="category_id" value={form.category_id} onChange={handleChange}>
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="svc-price">Price (UGX, leave empty if it varies)</label>
        <input id="svc-price" name="price" type="number" min="0" step="100" value={form.price} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label htmlFor="svc-location">Location</label>
        <input id="svc-location" name="location" value={form.location} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label htmlFor="svc-description">Description</label>
        <textarea id="svc-description" name="description" rows="4" value={form.description} onChange={handleChange} />
      </div>

      <label className="checkbox-row">
        <input type="checkbox" name="is_available" checked={form.is_available} onChange={handleChange} />
        {" "}Currently available
      </label>

      <button type="submit" className="primary-button full-width" disabled={saving}>
        {saving ? "Saving..." : initialData ? "Save changes" : "Add service"}
      </button>
    </form>
  );
}

export default ServiceForm;