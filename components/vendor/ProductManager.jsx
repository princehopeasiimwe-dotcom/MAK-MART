import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

function ProductManagement({
  products = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}) {
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
          onClick={() => onAdd?.()}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : !products.length ? (
        <div className="empty-state">
          <h3>No products yet</h3>
          <p>Add your first product to start selling on KU Market.</p>
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
                <strong>
                  {formatCurrency(product.price)}
                </strong>
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