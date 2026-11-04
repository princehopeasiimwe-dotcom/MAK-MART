import { supabase } from "./supabase";

// Decides where a freshly signed-in user should land.
// Admin status comes from the `admins` table (column user_id),
// the same source the RLS policies use.
export async function getHomePathForUser(userId) {
  if (!userId) return "/";

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (admin) return "/admin/dashboard";

  // Go by what the account owns first, so someone who is a vendor (or a
  // service provider) always lands on their dashboard even if the single
  // profile.role label is out of date.
  const [{ data: vendor }, { data: provider }, { data: profile }] = await Promise.all([
    supabase.from("vendors").select("id").eq("owner_id", userId).limit(1).maybeSingle(),
    supabase.from("service_providers").select("id").eq("owner_id", userId).limit(1).maybeSingle(),
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);

  if (vendor || profile?.role === "vendor") return "/vendor/dashboard";
  if (provider || profile?.role === "service_provider") return "/provider/dashboard";

  return "/";
}