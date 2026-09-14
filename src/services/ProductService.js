import { supabase } from "../lib/supabase";

const PRODUCT_SELECT = `
  *,
  vendors (
    id,
    business_name,
    phone,
    location
  ),
  categories (
    id,
    name,
    image_url
  ),
  product_images (
    id,
    image_url,
    is_primary,
    display_order
  )
`;

function withPrimaryImage(product) {
  if (!product) return product;

  const images = [...(product.product_images || [])].sort(
    (a, b) =>
      (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
      a.display_order - b.display_order
  );

  return {
    ...product,
    image_url: images[0]?.image_url || null,
  };
}

const ProductService = {
  async getProducts(options = {}) {
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.vendorId) {
      query = query.eq("vendor_id", options.vendorId);
    }

    if (options.category) {
      query = query.eq("category_id", options.category);
    }

    if (options.featured) {
      query = query.eq("is_featured", true);
    }

    if (!options.includeUnavailable) {
      query = query.eq("is_available", true);
    }

    if (options.search) {
      query = query.ilike("name", `%${options.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(withPrimaryImage);
  },

  async getProductById(id) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;

    return withPrimaryImage(data);
  },

  async getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    return data || [];
  },

  async createProduct(product, imageUrl = null) {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;

    if (imageUrl) {
      await supabase.from("product_images").insert([
        {
          product_id: data.id,
          image_url: imageUrl,
          is_primary: true,
          display_order: 0,
        },
      ]);
    }

    return data;
  },

  async updateProduct(id, updates, imageUrl = null) {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (imageUrl) {
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", id);

      await supabase.from("product_images").insert([
        {
          product_id: id,
          image_url: imageUrl,
          is_primary: true,
          display_order: 0,
        },
      ]);
    }

    return data;
  },

  async deleteProduct(id) {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  },

  async archiveProduct(id) {
    return ProductService.updateProduct(id, {
      is_available: false,
    });
  },

  async restoreProduct(id) {
    return ProductService.updateProduct(id, {
      is_available: true,
    });
  },
};

export default ProductService;
