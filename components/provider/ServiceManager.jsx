import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

function ServiceManager({
  services = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <div className="dashboard-page">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">MY SERVICES</span>
          <h1>Services</h1>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => onAdd?.()}
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : !services.length ? (
        <div className="empty-state">
          <h3>No services yet</h3>
          <p>Add your first service to start getting requests on KU Market.</p>
        </div>
      ) : (
        <div className="product-management">
          {services.map((service) => (
            <div className="vendor-product-row" key={service.id}>
              <div className="vendor-product-info">
                <h3>{service.name}</h3>
                <p>{service.service_categories?.name || "Uncategorized"}</p>
                <strong>
                  {service.price != null
                    ? formatCurrency(service.price)
                    : "Price varies"}
                </strong>
              </div>

              <div className="vendor-product-actions">
                <button
                  type="button"
                  onClick={() => onEdit?.(service)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete?.(service)}
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

export default ServiceManager;