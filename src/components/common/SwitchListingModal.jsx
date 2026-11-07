import { useEffect, useState } from "react";
import Modal from "./modal";
import MoneyInput from "./MoneyInput";
import CategoryPicker from "./CategoryPicker";
import ErrorMessage from "./ErrorMessage";
import ProductService from "../../services/ProductService";
import ServiceService from "../../services/services";
import { parseMoney } from "../../utils/money";
import { switchProductToService, switchServiceToProduct } from "../../lib/seller";
import useAuth from "../../hooks/useAuth";

// Turns one listing into the other kind, in place:
//   kind="product" -> becomes a SERVICE
//   kind="service" -> becomes a PRODUCT
// No new sign-up and no second approval: the account keeps the approval it
// already has. Name, description, price, location and photo come along.
function SwitchListingModal({ kind, item, onClose, onDone }) {
  const { refreshProfile } = useAuth();
  const toService = kind === "product";

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState(
    item?.price != null && !toService ? String(Math.round(Number(item.price))) : ""
  );
  const [stock, setStock] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;

    const load = toService ? ServiceService.getServiceCategories() : ProductService.getCategories();
    load.then(setCategories).catch(() => setCategories([]));
  }, [item, toService]);


  if (!item) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!toService) {
      if (!categoryId) {
        setError("Please choose a product category.");
        return;
      }
      if (item.price == null && !item.has_packages && parseMoney(price) == null) {
        setError("Enter the price for this product.");
        return;
      }
    }

    setSaving(true);
    try {
      let newId;
      if (toService) {
        newId = await switchProductToService(item.id, categoryId || null);
      } else {
        newId = await switchServiceToProduct(item.id, {
          categoryId,
          price: price !== "" ? parseMoney(price) : null,
          stock: Number(stock) || 0,
        });
      }
      await refreshProfile?.();
      onDone?.(newId);
    } catch (err) {
      setError(err.message || "Could not switch this listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={toService ? "Make this a service" : "Make this a product"}
    >
      <form onSubmit={handleSubmit}>
        <ErrorMessage message={error} onClose={() => setError("")} />

        <p>
          <strong>{item.name}</strong> will move from your {toService ? "products" : "services"} to
          your {toService ? "services" : "products"}. Its name, description, price and photo come
          with it. You don't need to sign up again or wait for another approval.
        </p>

        {toService ? (
          <div className="form-group">
            <label htmlFor="switch-category">Service category</label>
            <select
              id="switch-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              idPrefix="switch-category"
            />

            {!item.has_packages && (
              <div className="form-group">
                <label htmlFor="switch-price">Price (UGX)</label>
                <MoneyInput
                  id="switch-price"
                  name="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="35,000"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="switch-stock">Stock quantity</label>
              <input
                id="switch-stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </>
        )}

        <p className="field-hint">
          The {toService ? "product" : "service"} is removed once it has moved. Orders and requests
          you already received are kept.
        </p>

        <button type="submit" className="primary-button full-width" disabled={saving}>
          {saving ? "Switching..." : toService ? "Make it a service" : "Make it a product"}
        </button>
      </form>
    </Modal>
  );
}

export default SwitchListingModal;
