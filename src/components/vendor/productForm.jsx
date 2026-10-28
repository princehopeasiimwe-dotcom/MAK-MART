import { useEffect, useRef, useState } from "react";
import MoneyInput from "../common/MoneyInput";
import { parseMoney } from "../../utils/money";
import Button from "../common/button";
import ErrorMessage from "../common/ErrorMessage";
import ImageUploadField from "../common/ImageUploadField";
import CategoryPicker from "../common/CategoryPicker";
import ProductService from "../../services/ProductService";
import { discountPercent, endOfDayIso, dateInputValue } from "../../lib/promo";
import { formatCurrency } from "../../utils/currency";

const initialForm = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "1",
  condition: "new",
  category_id: "",
  image_url: "",
  promo_on: false,
  promo_price: "",
  promo_ends: "",
};

// A product on promotion keeps its OLD price in compare_at_price and the
// price customers pay now in price. The form shows them as
// "normal price" + "promotion price", which is easier to understand.
const roundMoney = (value) => String(Math.round(Number(value)));

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
          price:
            Number(initialData.compare_at_price) > Number(initialData.price)
              ? roundMoney(initialData.compare_at_price)
              : initialData.price
              ? roundMoney(initialData.price)
              : "",
          promo_on: Number(initialData.compare_at_price) > Number(initialData.price),
          promo_price:
            Number(initialData.compare_at_price) > Number(initialData.price)
              ? roundMoney(initialData.price)
              : "",
          promo_ends: dateInputValue(initialData.promo_ends_at),
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

    const regular = parseMoney(form.price);
    const promo = form.promo_on ? parseMoney(form.promo_price) : 0;

    if (form.promo_on) {
      if (!promo) {
        setError("Enter the promotion price.");
        return;
      }
      if (promo >= regular) {
        setError("The promotion price must be lower than the normal price.");
        return;
      }
      if (promo < regular * 0.1) {
        setError("A promotion can be at most 90% off.");
        return;
      }
      if (form.promo_ends && endOfDayIso(form.promo_ends) <= new Date().toISOString()) {
        setError("The promotion end date must be today or later.");
        return;
      }
    }

    setSaving(true);

    try {
      await onSubmit?.(
        {
          name: form.name,
          description: form.description,
          price: form.promo_on ? promo : regular,
          compare_at_price: form.promo_on ? regular : null,
          promo_ends_at:
            form.promo_on && form.promo_ends ? endOfDayIso(form.promo_ends) : null,
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
          {form.promo_on ? "Normal price (UGX), shown crossed out" : "Price (UGX)"}
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

      <div className="form-group promo-box">
        <label className="promo-box__toggle">
          <input
            type="checkbox"
            checked={form.promo_on}
            onChange={(event) =>
              setForm((current) => ({ ...current, promo_on: event.target.checked }))
            }
          />
          <span>Put this product on promotion (Black November deal)</span>
        </label>

        {form.promo_on && (
          <>
            <label htmlFor="promo_price">Promotion price (UGX)</label>
            <MoneyInput
              id="promo_price"
              name="promo_price"
              value={form.promo_price}
              onChange={handleChange}
              placeholder="25,000"
            />

            <label htmlFor="promo_ends">Promotion ends on (optional)</label>
            <input
              id="promo_ends"
              name="promo_ends"
              type="date"
              value={form.promo_ends}
              onChange={handleChange}
            />
            <p className="field-hint">
              On that date the product goes back to its normal price by itself.
              Leave it empty to end the promotion yourself later.
            </p>

            {parseMoney(form.price) > 0 &&
              parseMoney(form.promo_price) > 0 &&
              parseMoney(form.promo_price) < parseMoney(form.price) && (
                <p className="promo-box__preview">
                  Customers will see{" "}
                  <s>{formatCurrency(parseMoney(form.price))}</s>{" "}
                  <strong>{formatCurrency(parseMoney(form.promo_price))}</strong>{" "}
                  <span>
                    (-{discountPercent({
                      price: parseMoney(form.promo_price),
                      compare_at_price: parseMoney(form.price),
                    })}%)
                  </span>
                </p>
              )}
          </>
        )}
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