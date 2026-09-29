import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("id")
      .limit(1);

    if (error) {
      console.error(
        "❌ SUPABASE ERROR:",
        error.message
      );

      return false;
    }

    console.log(
      "📦 SUPABASE DATA:",
      data
    );

    console.log(
      "✅ SUPABASE CONNECTION SUCCESSFUL"
    );

    return true;
  } catch (error) {
    console.error(
      "❌ SUPABASE CONNECTION FAILED:",
      error
    );

    return false;
  }
}