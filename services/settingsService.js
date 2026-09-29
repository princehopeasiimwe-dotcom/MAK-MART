import { supabase } from "../lib/supabase";

const SettingsService = {
  async getSetting(key) {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;

    return data?.value || "";
  },

  async updateSetting(key, value) {
    const { data, error } = await supabase
      .from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return data;
  },
};

export default SettingsService;