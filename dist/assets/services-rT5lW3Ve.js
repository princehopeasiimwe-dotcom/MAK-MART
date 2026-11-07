import{s as a}from"./index-DkHNMs1t.js";const c=`
  *,
  service_providers (
    id,
    business_name,
    phone,
    location
  ),
  service_categories (
    id,
    name,
    image_url
  )
`,s="*",o={async getServices(r={}){let e=a.from("services").select(c).eq("is_available",!0).order("created_at",{ascending:!1});r.category&&(e=e.eq("category_id",r.category)),r.providerId&&(e=e.eq("provider_id",r.providerId)),r.limit&&(e=e.limit(r.limit));const{data:t,error:i}=await e;if(i)throw i;return t||[]},async getServiceById(r){const{data:e,error:t}=await a.from("services").select(c).eq("id",r).single();if(t)throw t;return e},async getServiceCategories(){const{data:r,error:e}=await a.from("service_categories").select("*").order("name",{ascending:!0});if(e)throw e;return r||[]},async getServicesByProvider(r){const{data:e,error:t}=await a.from("services").select(c).eq("provider_id",r).order("created_at",{ascending:!1});if(t)throw t;return e||[]},async createService(r){const{data:e,error:t}=await a.from("services").insert([r]).select().single();if(t)throw t;return e},async updateService(r,e){const{data:t,error:i}=await a.from("services").update(e).eq("id",r).select().single();if(i)throw i;return t},async deleteService(r){const{error:e}=await a.from("services").delete().eq("id",r);if(e)throw e;return!0},async getProviders(r="active"){let e=a.from("service_providers").select(s).order("created_at",{ascending:!1});r==="active"?e=e.eq("is_active",!0):r==="pending"&&(e=e.eq("is_active",!1));const{data:t,error:i}=await e;if(i)throw i;return t||[]},async getProviderById(r){const{data:e,error:t}=await a.from("service_providers").select(s).eq("id",r).single();if(t)throw t;return e},async getProviderByOwnerId(r){const{data:e,error:t}=await a.from("service_providers").select(s).eq("owner_id",r).maybeSingle();if(t)throw t;return e},async getAllProviders(r=null){let e=a.from("service_providers").select(s).order("created_at",{ascending:!1});r==="active"?e=e.eq("is_active",!0):r==="pending"&&(e=e.eq("is_active",!1));const{data:t,error:i}=await e;if(i)throw i;return t||[]},async createProvider(r){const{data:e,error:t}=await a.from("service_providers").insert([r]).select().single();if(t)throw t;return e},async updateProvider(r,e){const{data:t,error:i}=await a.from("service_providers").update(e).eq("id",r).select().single();if(i)throw i;return t},async approveProvider(r){return o.updateProvider(r,{is_active:!0,is_verified:!0})},async rejectProvider(r){return o.updateProvider(r,{is_active:!1})}};export{o as S};
