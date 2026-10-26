import { useState } from "react";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
import ImageUploadField from "../common/ImageUploadField";
import { descendantIds, flattenTree, heightOf } from "../../lib/categoryTree";

const initialForm = {
  name: "",
  description: "",
  image_url: "",
  is_active: true,
  parent_id: "",
};

function CategoryForm({
  initialData = null,
  categories = [],
  parentId = "",
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
          parent_id: initialData.parent_id || "",
        }
      : { ...initialForm, parent_id: parentId || "" }
  );

  const [error, setError] = useState("");

  // Where can this category go? Anything that is not itself (or inside itself)
  // and leaves room for the levels already underneath it (3 levels max).
  const ownHeight = initialData ? heightOf(categories, initialData.id) : 1;
  const blocked = new Set(
    initialData ? descendantIds(categories, initialData.id) : []
  );
  const parentOptions = flattenTree(categories).filter(
    (category) => !blocked.has(category.id) && category.depth + ownHeight <= 3
  );

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
        parent_id: form.parent_id || null,
      });

      if (!initialData) {
        setForm({ ...initialForm, parent_id: parentId || "" });
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

      <div className="form-group">
        <label htmlFor="parent_id">
          Sits under
        </label>

        <select
          id="parent_id"
          name="parent_id"
          value={form.parent_id}
          onChange={handleChange}
        >
          <option value="">
            Nothing - this is a main category
          </option>

          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.path}
            </option>
          ))}
        </select>
        <p className="field-hint">
          Example: to make "iPhones", choose "Technology › Phones". Up to
          three levels.
        </p>
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