import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";

import ProductService from "../../services/ProductService";
import Modal from "../../components/common/modal";
import CategoryForm from "../../components/admin/CategoryForm";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProductService.getAllCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = () => {
    setSelectedCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setModalOpen(true);
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      if (selectedCategory) {
        await ProductService.updateCategory(selectedCategory.id, data);
      } else {
        await ProductService.createCategory(data);
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Products already using this category will keep their listing but lose their category tag.`
    );

    if (!confirmed) return;

    try {
      await ProductService.deleteCategory(category.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete category.");
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Categories</h1>
          <p>Manage the categories shoppers browse by.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleAdd}
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading categories...</p>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <h3>No categories yet</h3>
          <p>Add your first category to help shoppers browse.</p>
        </div>
      ) : (
        <div className="admin-category-grid">
          {categories.map((category) => (
            <div className="admin-category-card" key={category.id}>
              <div className="admin-category-card__image">
                {category.image_url ? (
                  <img src={category.image_url} alt={category.name} />
                ) : (
                  <ImageOff size={22} />
                )}

                {!category.is_active && (
                  <span className="admin-category-card__hidden">
                    Hidden
                  </span>
                )}
              </div>

              <div className="admin-category-card__content">
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
              </div>

              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => handleEdit(category)}
                  title="Edit"
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleDelete(category)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedCategory ? "Edit Category" : "Add Category"
        }
      >
        <CategoryForm
          initialData={selectedCategory}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </Modal>
    </section>
  );
}

export default AdminCategories;