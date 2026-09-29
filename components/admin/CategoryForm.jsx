import { useState } from "react";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
import ImageUploadField from "../common/ImageUploadField";

const initialForm = {
  name: "",
  description: "",
  image_url: "",
  is_active: true,
};

function CategoryForm({
  initialData = null,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState(
    initialData
      ? {
          name: initialData.name || "",
          description: initialData.description || "",
          image_url: initialData.image_url || "",
          is_active: initialData.is_active ?? true,
        }
      : initialForm
  );

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      await onSubmit?.({
        name: form.name.trim(),
        description: form.description,
        image_url: form.image_url,
        is_active: form.is_active,
      });

      if (!initialData) {
        setForm(initialForm);
      }
    } catch (err) {
      setError(
        err.message || "Unable to save category."
      );
    }
  };

  return (
    <form
      className="vendor-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError("")}
        />
      )}

      <div className="form-group">
        <label htmlFor="name">
          Category name
        </label>

        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Fashion"
        />
      </div>

      <ImageUploadField
        bucket="category-images"
        value={form.image_url}
        onChange={(url) =>
          setForm((current) => ({
            ...current,
            image_url: url,
          }))
        }
        label="Category image"
      />

      <div className="form-group">
        <label htmlFor="description">
          Description (optional)
        </label>

        <textarea
          id="description"
          name="description"
          rows="3"
          value={form.description}
          onChange={handleChange}
          placeholder="Shown as a subtitle where relevant"
        />
      </div>

      <div className="form-group form-group--checkbox">
        <label>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                is_active: event.target.checked,
              }))
            }
          />
          Visible to shoppers
        </label>
      </div>

      <Button
        type="submit"
        loading={loading}
      >
        {initialData
          ? "Update Category"
          : "Add Category"}
      </Button>
    </form>
  );
}

export default CategoryForm;