import { useCallback, useEffect, useState } from "react";
import ProductService from "../services/ProductService";

function useProducts(options = {}) {
  const {
    vendorId = null,
    category = null,
    search = "",
    featured = false,
    includeUnavailable = false,
    autoLoad = true,
  } = options;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await ProductService.getProducts({
        vendorId,
        category,
        search,
        featured,
        includeUnavailable,
      });

      setProducts(data || []);

      return data;
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(err.message || "Failed to load products.");
      setProducts([]);

      return [];
    } finally {
      setLoading(false);
    }
  }, [vendorId, category, search, featured, includeUnavailable]);

  useEffect(() => {
    if (autoLoad) {
      fetchProducts();
    }
  }, [autoLoad, fetchProducts]);

  const getProduct = async (id) => {
    try {
      setLoading(true);
      setError(null);

      return await ProductService.getProductById(id);
    } catch (err) {
      console.error("Failed to load product:", err);
      setError(err.message || "Failed to load product.");

      return null;
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData, imageUrl) => {
    const newProduct =
      await ProductService.createProduct(productData, imageUrl);

    await fetchProducts();

    return newProduct;
  };

  const updateProduct = async (id, updates, imageUrl) => {
    const updatedProduct =
      await ProductService.updateProduct(id, updates, imageUrl);

    await fetchProducts();

    return updatedProduct;
  };

  const deleteProduct = async (id) => {
    await ProductService.deleteProduct(id);

    setProducts((current) =>
      current.filter((product) => product.id !== id)
    );
  };

  return {
    products,
    loading,
    error,

    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

export default useProducts;