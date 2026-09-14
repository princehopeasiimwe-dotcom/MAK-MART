import { useEffect, useState } from "react";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
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
          price: initialData.price || "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError("Enter a valid product price.");
      return;
    }

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    try {
      await onSubmit?.({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity) || 0,
        condition: form.condition,
        category_id: form.category_id,
        image_url: form.image_url,
      });

      if (!initialData) {
        setForm(initialForm);
      }
    } catch (err) {
      setError(
        err.message || "Unable to save product."
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

      <div className="form-group">
        <label htmlFor="category_id">
          Category
        </label>

        <select
          id="category_id"
          name="category_id"
          value={form.category_id}
          onChange={handleChange}
        >
          <option value="">
            Select a category
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="price">
          Price (UGX)
        </label>

        <input
          id="price"
          name="price"
          type="number"
          min="0"
          value={form.price}
          onChange={handleChange}
          placeholder="35000"
        />
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

      <div className="form-group">
        <label htmlFor="image_url">
          Product image URL
        </label>

        <input
          id="image_url"
          name="image_url"
          type="url"
          value={form.image_url}
          onChange={handleChange}
          placeholder="https://..."
        />
      </div>

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

      <Button
        type="submit"
        loading={loading}
      >
        {initialData
          ? "Update Product"
          : "Add Product"}
      </Button>
    </form>
  );
}

export default ProductForm;
