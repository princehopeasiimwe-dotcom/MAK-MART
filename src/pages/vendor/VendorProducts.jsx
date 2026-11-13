import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SettingsService from "../../services/settingsService";
import useAuth from "../../hooks/useAuth";
import useProducts from "../../hooks/useProducts";

import ProductManagement from "../../components/vendor/ProductManager";
import ProductForm from "../../components/vendor/productForm";
import Modal from "../../components/common/modal";
import SwitchListingModal from "../../components/common/SwitchListingModal";

function VendorProducts() {
  const { vendor } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(null);

  const {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts({
    vendorId: vendor?.id,
    includeUnavailable: true,
  });

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [limit, setLimit] = useState(0);
  const [lowStockAt, setLowStockAt] = useState(3);

  useEffect(() => {
    SettingsService.getSetting("max_products_per_vendor")
      .then((value) => {
        const n = parseInt(value, 10);
        setLimit(Number.isFinite(n) && n > 0 ? n : value === "" ? 4 : 0);
      })
      .catch(() => setLimit(0));
  }, []);

  useEffect(() => {
    SettingsService.getSetting("low_stock_threshold")
      .then((value) => {
        const n = parseInt(value, 10);
        if (Number.isFinite(n) && n >= 0) setLowStockAt(n);
      })
      .catch(() => {});
  }, []);

  const handleRestock = async (product, quantity) => {
    await updateProduct(product.id, { stock_quantity: quantity });
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleSubmit = async (data, { addAnother = false } = {}) => {
    const { image_url, ...productFields } = data;

    if (selectedProduct) {
      await updateProduct(
        selectedProduct.id,
        productFields,
        image_url
      );
    } else {
      await createProduct(
        {
          ...productFields,
          vendor_id: vendor.id,
        },
        image_url
      );
    }

    // "Save & add another" keeps the window open for the next product,
    // unless that was the last free slot.
    const full = !selectedProduct && limit > 0 && products.length + 1 >= limit;
    if (!addAnother || full) {
      setModalOpen(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"?`
    );

    if (confirmed) {
      await deleteProduct(product.id);
    }
  };

  if (!vendor) {
    return (
      <div className="empty-state">
        <h3>Vendor account not found</h3>
        <p>
          Your vendor profile isn't set up yet. Please
          contact support.
        </p>
      </div>
    );
  }

  return (
    <>
      <ProductManagement
        products={products}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSwitch={setSwitching}
        limit={limit}
        lowStockAt={lowStockAt}
        onRestock={handleRestock}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedProduct
            ? "Edit Product"
            : "Add Product"
        }
      >
        <ProductForm
          initialData={selectedProduct}
          onSubmit={handleSubmit}
        />
      </Modal>

      {switching && (
        <SwitchListingModal
          key={switching.id}
          kind="product"
          item={switching}
          onClose={() => setSwitching(null)}
          onDone={() => {
            setSwitching(null);
            navigate("/provider/services");
          }}
        />
      )}
    </>
  );
}

export default VendorProducts;