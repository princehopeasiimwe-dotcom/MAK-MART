import{s as i}from"./index-DkHNMs1t.js";const o=`
  *,
  vendors (
    id,
    business_name,
    phone,
    location,
    is_verified
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
`;function d(e){var t;if(!e)return e;const r=[...e.product_images||[]].sort((a,s)=>(s.is_primary?1:0)-(a.is_primary?1:0)||a.display_order-s.display_order);return{...e,image_url:((t=r[0])==null?void 0:t.image_url)||null}}const c={async getProducts(e={}){let r=i.from("products").select(o).order("created_at",{ascending:!1});e.limit&&(r=r.limit(e.limit)),e.vendorId&&(r=r.eq("vendor_id",e.vendorId)),e.category&&(r=r.eq("category_id",e.category)),e.featured&&(r=r.eq("is_featured",!0)),e.includeUnavailable||(r=r.eq("is_available",!0)),e.search&&(r=r.ilike("name",`%${e.search}%`));const{data:t,error:a}=await r;if(a)throw a;return(t||[]).map(d)},async getProductById(e){const{data:r,error:t}=await i.from("products").select(o).eq("id",e).single();if(t)throw t;return d(r)},async getCategories(){const{data:e,error:r}=await i.from("categories").select("*").eq("is_active",!0).order("name",{ascending:!0});if(r)throw r;return e||[]},async getAllCategories(){const{data:e,error:r}=await i.from("categories").select("*").order("name",{ascending:!0});if(r)throw r;return e||[]},async createCategory(e){const{data:r,error:t}=await i.from("categories").insert([e]).select().single();if(t)throw t;return r},async updateCategory(e,r){const{data:t,error:a}=await i.from("categories").update(r).eq("id",e).select().single();if(a)throw a;return t},async deleteCategory(e){const{error:r}=await i.from("categories").delete().eq("id",e);if(r)throw r;return!0},async createProduct(e,r=null){const{data:t,error:a}=await i.from("products").insert([e]).select().single();if(a)throw a;return r&&await i.from("product_images").insert([{product_id:t.id,image_url:r,is_primary:!0,display_order:0}]),t},async updateProduct(e,r,t=null){const{data:a,error:s}=await i.from("products").update(r).eq("id",e).select().single();if(s)throw s;return t&&(await i.from("product_images").delete().eq("product_id",e),await i.from("product_images").insert([{product_id:e,image_url:t,is_primary:!0,display_order:0}])),a},async deleteProduct(e){const{error:r}=await i.from("products").delete().eq("id",e);if(r)throw r;return!0},async archiveProduct(e){return c.updateProduct(e,{is_available:!1})},async restoreProduct(e){return c.updateProduct(e,{is_available:!0})}};export{c as P};
