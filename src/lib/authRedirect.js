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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role === "vendor") return "/vendor/dashboard";
  if (profile?.role === "service_provider") return "/provider/dashboard";

  return "/";
}