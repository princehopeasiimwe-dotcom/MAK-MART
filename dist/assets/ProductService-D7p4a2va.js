import{s as i}from"./index-DoDNu7Zf.js";function y(e){const r=Number((e==null?void 0:e.compare_at_price)||0),t=Number((e==null?void 0:e.price)||0);if(!(r>t))return!1;if(e!=null&&e.promo_ends_at){const a=new Date(e.promo_ends_at).getTime();if(!Number.isNaN(a)&&a<=Date.now())return!1}return!0}function _(e){const r=Number((e==null?void 0:e.compare_at_price)||0),t=Number((e==null?void 0:e.price)||0);return r>t?Math.max(1,Math.round((1-t/r)*100)):0}function h(e){if(!(e!=null&&e.promo_ends_at))return"";const r=new Date(e.promo_ends_at);if(Number.isNaN(r.getTime()))return"";const t="Africa/Nairobi",a=l=>new Intl.DateTimeFormat("en-CA",{timeZone:t}).format(l),n=a(new Date),s=a(new Date(Date.now()+1440*60*1e3)),c=a(r);return c===n?"Ends today":c===s?"Ends tomorrow":`Ends ${new Intl.DateTimeFormat("en-GB",{timeZone:t,day:"numeric",month:"short"}).format(r)}`}function P(e){return e?`${e}T23:59:59+03:00`:null}function p(e){if(!e)return"";const r=new Date(e);return Number.isNaN(r.getTime())?"":new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi"}).format(r)}function b(e){return(e||[]).map((r,t)=>({product:r,index:t,off:_(r)})).sort((r,t)=>t.off-r.off||r.index-t.index).map(r=>r.product)}let d=0,o=null;function g(){return o||(Date.now()-d<120*1e3?Promise.resolve():(o=Promise.resolve(i.rpc("expire_promotions")).catch(()=>{}).finally(()=>{d=Date.now(),o=null}),o))}const u=`
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
`;function m(e){var t;if(!e)return e;const r=[...e.product_images||[]].sort((a,n)=>(n.is_primary?1:0)-(a.is_primary?1:0)||a.display_order-n.display_order);return{...e,image_url:((t=r[0])==null?void 0:t.image_url)||null}}const f={async getProducts(e={}){await g();let r=i.from("products").select(u).order("created_at",{ascending:!1});e.limit&&(r=r.limit(e.limit)),e.vendorId&&(r=r.eq("vendor_id",e.vendorId)),e.category&&(r=r.eq("category_id",e.category)),e.featured&&(r=r.eq("is_featured",!0)),e.includeUnavailable||(r=r.eq("is_available",!0)),e.search&&(r=r.ilike("name",`%${e.search}%`));const{data:t,error:a}=await r;if(a)throw a;return(t||[]).map(m)},async getProductById(e){const{data:r,error:t}=await i.from("products").select(u).eq("id",e).single();if(t)throw t;return m(r)},async getCategories(){const{data:e,error:r}=await i.from("categories").select("*").eq("is_active",!0).order("name",{ascending:!0});if(r)throw r;return e||[]},async getAllCategories(){const{data:e,error:r}=await i.from("categories").select("*").order("name",{ascending:!0});if(r)throw r;return e||[]},async createCategory(e){const{data:r,error:t}=await i.from("categories").insert([e]).select().single();if(t)throw t;return r},async updateCategory(e,r){const{data:t,error:a}=await i.from("categories").update(r).eq("id",e).select().single();if(a)throw a;return t},async deleteCategory(e){const{error:r}=await i.from("categories").delete().eq("id",e);if(r)throw r;return!0},async createProduct(e,r=null){const{data:t,error:a}=await i.from("products").insert([e]).select().single();if(a)throw a;if(r){const{error:n}=await i.from("product_images").insert([{product_id:t.id,image_url:r,is_primary:!0,display_order:0}]);if(n)throw new Error(`Your product was saved, but its photo could not be attached (${n.message}). Edit the product to add the photo again.`)}return t},async updateProduct(e,r,t=null){const{data:a,error:n}=await i.from("products").update(r).eq("id",e).select().single();if(n)throw n;if(t){await i.from("product_images").delete().eq("product_id",e);const{error:s}=await i.from("product_images").insert([{product_id:e,image_url:t,is_primary:!0,display_order:0}]);if(s)throw new Error(`Your changes were saved, but the photo could not be updated (${s.message}).`)}return a},async deleteProduct(e){const{error:r}=await i.from("products").delete().eq("id",e);if(r)throw r;return!0},async archiveProduct(e){return f.updateProduct(e,{is_available:!1})},async restoreProduct(e){return f.updateProduct(e,{is_available:!0})}};export{f as P,p as a,_ as d,P as e,y as i,h as p,b as s};
