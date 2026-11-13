import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ImageOff, FolderPlus } from "lucide-react";

import ProductService from "../../services/ProductService";
import Modal from "../../components/common/modal";
import CategoryForm from "../../components/admin/CategoryForm";
import { flattenTree } from "../../lib/categoryTree";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newParentId, setNewParentId] = useState("");
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

  const handleAdd = (parentId = "") => {
    setSelectedCategory(null);
    setNewParentId(parentId);
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
    if (categories.some((item) => item.parent_id === category.id)) {
      setError(
        `"${category.name}" still has sub-categories. Move or delete those first.`
      );
      return;
    }

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

  const tree = flattenTree(categories);

  return (
    <section className="dashboard-page">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Categories</h1>
          <p>Manage the categories shoppers browse by. Use the folder button to add a sub-category inside one.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => handleAdd()}
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
        <div className="admin-category-tree">
          {tree.map((category) => (
            <div
              className="admin-category-row"
              key={category.id}
              style={{ marginLeft: (category.depth - 1) * 26 }}
            >
              <div className="admin-category-row__thumb">
                {category.image_url ? (
                  <img src={category.image_url} alt="" />
                ) : (
                  <ImageOff size={18} />
                )}
              </div>

              <div className="admin-category-row__text">
                <strong>{category.name}</strong>
                <small>
                  {category.depth === 1
                    ? "Main category"
                    : category.depth === 2
                    ? "Sub-category"
                    : "Type"}
                  {category.depth > 1 && ` · ${category.path}`}
                  {!category.is_active && " · Hidden"}
                </small>
              </div>

              <div className="admin-row-actions">
                {category.depth < 3 && (
                  <button
                    type="button"
                    onClick={() => handleAdd(category.id)}
                    title="Add a sub-category inside this one"
                  >
                    <FolderPlus size={16} />
                  </button>
                )}

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
          key={selectedCategory?.id || `new-${newParentId}`}
          initialData={selectedCategory}
          categories={categories}
          parentId={newParentId}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </Modal>
    </section>
  );
}

export default AdminCategories;