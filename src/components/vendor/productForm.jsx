import { useEffect, useRef, useState } from "react";
import MoneyInput from "../common/MoneyInput";
import { parseMoney } from "../../utils/money";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
import ImageUploadField from "../common/ImageUploadField";
import CategoryPicker from "../common/CategoryPicker";
import ProductService from "../../services/ProductService";

const initialForm = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "1",
  condition: "new",
  category_id: "",
  image_url: "",
};

function ProductForm({
  initialData = null,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState(
    initialData
      ? {
          name: initialData.name || "",
          description: initialData.description || "",
          price: initialData.price ? String(Math.round(Number(initialData.price))) : "",
          stock_quantity:
            initialData.stock_quantity ?? "1",
          condition: initialData.condition || "new",
          category_id:
            initialData.category_id ||
            initialData.categories?.id ||
            "",
          image_url: initialData.image_url || "",
        }
      : initialForm
  );

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    ProductService.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // addAnother = true keeps the window open and clears the form so the
  // vendor can type the next product straight away.
  const save = async (addAnother = false) => {
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!parseMoney(form.price)) {
      setError("Enter a valid product price.");
      return;
    }

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit?.(
        {
          name: form.name,
          description: form.description,
          price: parseMoney(form.price),
          stock_quantity: Number(form.stock_quantity) || 0,
          condition: form.condition,
          category_id: form.category_id,
          image_url: form.image_url,
        },
        { addAnother }
      );

      if (!initialData) {
        if (addAnother) {
          // keep category + condition: vendors usually add similar items
          setForm({
            ...initialForm,
            category_id: form.category_id,
            condition: form.condition,
          });
          setSuccess(
            `"${form.name.trim()}" saved. Add your next product below.`
          );
          formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          setForm(initialForm);
        }
      }
    } catch (err) {
      setError(
        err.message || "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    save(false);
  };

  return (
    <form
      ref={formRef}
      className="vendor-form"
      onSubmit={handleSubmit}
    >
      {success && (
        <div className="form-success">{success}</div>
      )}

      {error && (
        <ErrorMessage
          message={error}
          onClose={() => setError("")}
        />
      )}

      <div className="form-group">
        <label htmlFor="name">
          Product name
        </label>

        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Luxury Oud Perfume"
        />
      </div>

      <CategoryPicker
        categories={categories}
        value={form.category_id}
        onChange={(id) =>
          setForm((current) => ({ ...current, category_id: id }))
        }
      />

      <div className="form-group">
        <label htmlFor="price">
          Price (UGX)
        </label>

        <MoneyInput
          id="price"
          name="price"
          value={form.price}
          onChange={handleChange}
          placeholder="35,000"
        />
        <p className="field-hint">You can type it with commas, like 35,000, or as 35k.</p>
      </div>

      <div className="form-group">
        <label htmlFor="stock_quantity">
          Stock quantity
        </label>

        <input
          id="stock_quantity"
          name="stock_quantity"
          type="number"
          min="0"
          value={form.stock_quantity}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="condition">
          Condition
        </label>

        <select
          id="condition"
          name="condition"
          value={form.condition}
          onChange={handleChange}
        >
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

      <ImageUploadField
        bucket="product-images"
        label="Product photo"
        value={form.image_url}
        onChange={(url) =>
          setForm((current) => ({ ...current, image_url: url }))
        }
      />

      <div className="form-group">
        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows="5"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe your product..."
        />
      </div>

      <div className="product-form-actions">
        <Button
          type="submit"
          loading={loading || saving}
        >
          {initialData
            ? "Update Product"
            : "Add Product"}
        </Button>

        {!initialData && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading || saving}
            onClick={() => save(true)}
          >
            Save &amp; add another
          </Button>
        )}
      </div>
    </form>
  );
}

export default ProductForm;