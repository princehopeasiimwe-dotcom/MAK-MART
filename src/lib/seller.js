import { supabase } from "./supabase";

// The database function isn't installed yet (migration 023 not run).
export const isMissingFunction = (err) =>
  /could not find the function|schema cache|function .* does not exist|PGRST202|42883/i.test(
    `${err?.message || ""} ${err?.code || ""}`
  );

// Opens a store ("vendor") or a services profile ("service_provider") on the
// account that is signed in right now. No second sign-up.
//
// The database function also carries over an approval the account already has
// (a live store means the services profile is live too, and the other way round).
// If that function hasn't been installed yet we still create the record directly
// so the person is never stuck; it then waits for approval as usual.
export async function becomeSeller(type, { userId, businessName, phone, location }) {
  const { error } = await supabase.rpc("become_seller", {
    p_type: type,
    p_business_name: businessName,
    p_phone: phone || "",
    p_location: location || "",
  });

  if (!error) return;
  if (!isMissingFunction(error)) throw error;

  const table = type === "vendor" ? "vendors" : "service_providers";

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (existing) return;

  const { error: insertError } = await supabase.from(table).insert({
    owner_id: userId,
    business_name: businessName,
    phone: phone || null,
    location: location || null,
  });
  if (insertError) throw insertError;
}

// Moves one listing across, server side and in a single step.
export async function switchProductToService(productId, categoryId) {
  const { data, error } = await supabase.rpc("convert_product_to_service", {
    p_product_id: productId,
    p_category_id: categoryId || null,
  });
  if (error) throw friendlySwitchError(error);
  return data;
}

export async function switchServiceToProduct(serviceId, { categoryId, price, stock }) {
  const { data, error } = await supabase.rpc("convert_service_to_product", {
    p_service_id: serviceId,
    p_category_id: categoryId,
    p_price: price ?? null,
    p_stock: stock ?? 1,
  });
  if (error) throw friendlySwitchError(error);
  return data;
}

function friendlySwitchError(error) {
  return isMissingFunction(error)
    ? new Error("Switching isn't switched on yet. The site admin needs to run the latest database update (migration 023).")
    : error;
}
