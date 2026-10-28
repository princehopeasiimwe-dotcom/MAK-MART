import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { isOnPromo, discountPercent, promoEndsLabel } from "../../lib/promo";

function ProductManagement({
  products = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  limit = 0,
}) {
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
                <button
                  type="button"
                  onClick={() => onEdit?.(product)}
                >
                  Edit
                </button>

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