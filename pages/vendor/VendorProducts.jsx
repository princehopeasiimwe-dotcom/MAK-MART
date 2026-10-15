import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import useProducts from "../../hooks/useProducts";

import ProductManagement from "../../components/vendor/ProductManager";
import ProductForm from "../../components/vendor/productForm";
import Modal from "../../components/common/modal";

function VendorProducts() {
  const { vendor } = useAuth();

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

  const handleAdd = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleSubmit = async (data) => {
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

    setModalOpen(false);
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
    </>
  );
}

export default VendorProducts;
