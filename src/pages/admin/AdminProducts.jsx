import { useEffect, useState } from "react";
import { Archive, RotateCcw } from "lucide-react";

import ProductService from "../../services/ProductService";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/formatters";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProductService.getProducts({
        includeUnavailable: true,
      });
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (product) => {
    setBusyId(product.id);
    try {
      if (product.is_available) {
        await ProductService.archiveProduct(product.id);
      } else {
        await ProductService.restoreProduct(product.id);
      }
      await load();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Products</h1>
          <p>Every product listed across all vendors.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products yet</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Listed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.vendors?.business_name || "—"}</td>
                <td>{product.categories?.name || "—"}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>
                  <span
                    className={`status-badge status-badge--${
                      product.is_available ? "approved" : "archived"
                    }`}
                  >
                    {product.is_available ? "Available" : "Archived"}
                  </span>
                </td>
                <td>{formatDate(product.created_at)}</td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      disabled={busyId === product.id}
                      onClick={() => toggleStatus(product)}
                      title={
                        product.is_available ? "Archive" : "Restore"
                      }
                    >
                      {product.is_available ? (
                        <Archive size={16} />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default AdminProducts;
