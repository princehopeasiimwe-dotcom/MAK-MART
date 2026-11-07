import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { isOnPromo, discountPercent, promoEndsLabel } from "../../lib/promo";

function ProductManagement({
  products = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onSwitch,
  limit = 0,
  lowStockAt = 3,
  onRestock,
}) {
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockError, setRestockError] = useState("");
  const isLow = (p) => typeof p.stock_quantity === "number" && p.stock_quantity <= lowStockAt;
  const lowCount = products.filter(isLow).length;

  const saveRestock = async (product) => {
    const qty = parseInt(restockQty, 10);
    if (!Number.isFinite(qty) || qty < 0 || qty > 100000) {
      setRestockError("Enter a number from 0 to 100000.");
      return;
    }
    try {
      await onRestock?.(product, qty);
      setRestockId(null);
      setRestockQty("");
      setRestockError("");
    } catch (err) {
      setRestockError(err.message || "Could not update the stock.");
    }
  };

  const atLimit = limit > 0 && products.length >= limit;
  return (
    <div className="dashboard-page">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">MY PRODUCTS</span>
          <h1>Products</h1>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={atLimit}
          onClick={() => onAdd?.()}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {limit > 0 && (
        <p className={`product-limit ${atLimit ? "is-full" : ""}`}>
          {atLimit
            ? `You've used all ${limit} product slots. Delete a product to add a different one.`
            : `${products.length} of ${limit} products used.`}
        </p>
      )}

      {lowCount > 0 && (
        <div className="low-stock-banner" role="status">
          <TriangleAlert size={18} aria-hidden="true" />
          {lowCount === 1 ? "1 product is" : `${lowCount} products are`} low or sold out. Restock below so you do not miss sales.
        </div>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : !products.length ? (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>Add your first product to start selling on MAK MART.</p>
        </div>
      ) : (
        <div className="product-management">
          {products.map((product) => (
            <div className="vendor-product-row" key={product.id}>
              <div className="vendor-product-image">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <span>📦</span>
                )}
              </div>

              <div className="vendor-product-info">
                <h3>{product.name}</h3>
                <p>{product.categories?.name || "Uncategorized"}</p>
                {typeof product.stock_quantity === "number" && (
                  <span className={`vendor-stock ${product.stock_quantity === 0 ? "is-out" : isLow(product) ? "is-low" : ""}`}>
                    {product.stock_quantity === 0 ? "Sold out" : isLow(product) ? `Only ${product.stock_quantity} left` : `${product.stock_quantity} in stock`}
                  </span>
                )}
                {isOnPromo(product) ? (
                  <>
                    <s className="vendor-oldprice">
                      {formatCurrency(product.compare_at_price)}
                    </s>{" "}
                    <strong>{formatCurrency(product.price)}</strong>
                    <span className="vendor-promo-tag">
                      -{discountPercent(product)}% promo
                      {promoEndsLabel(product) ? ` · ${promoEndsLabel(product)}` : ""}
                    </span>
                  </>
                ) : (
                  <strong>
                    {formatCurrency(product.price)}
                  </strong>
                )}
              </div>

              <div className="vendor-product-actions">
                {onRestock && typeof product.stock_quantity === "number" && (
                  restockId === product.id ? (
                    <span className="restock-inline">
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        aria-label={`New stock for ${product.name}`}
                        placeholder="New stock"
                      />
                      <button type="button" onClick={() => saveRestock(product)}>Save</button>
                      <button type="button" onClick={() => { setRestockId(null); setRestockError(""); }}>Cancel</button>
                      {restockError && <small className="form-error">{restockError}</small>}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setRestockId(product.id); setRestockQty(String(product.stock_quantity)); setRestockError(""); }}
                    >
                      Restock
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => onEdit?.(product)}
                >
                  Edit
                </button>

                {onSwitch && (
                  <button
                    type="button"
                    onClick={() => onSwitch(product)}
                    title="Move this listing to your services"
                  >
                    Make it a service
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDelete?.(product)}
                  className="danger-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductManagement;