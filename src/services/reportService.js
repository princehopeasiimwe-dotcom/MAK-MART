import { supabase } from "../lib/supabase";

export const REPORT_REASONS = [
  { value: "scam", label: "Looks like a scam" },
  { value: "fake", label: "Fake or misleading" },
  { value: "wrong_price", label: "Wrong or misleading price" },
  { value: "wrong_category", label: "In the wrong category" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

const ReportService = {
  // type: "product" | "service" | "vendor" | "provider"
  async report(type, id, reason, details = "") {
    const { data, error } = await supabase.rpc("report_listing", {
      p_type: type,
      p_id: id,
      p_reason: reason,
      p_details: details || null,
    });
    if (error) throw error;
    return data;
  },

  async list(status = "open") {
    let query = supabase
      .from("listing_reports")
      .select("id, target_type, target_id, target_label, reason, details, status, admin_note, created_at, resolved_at, reporter_id, profiles:reporter_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async resolve(id, status, note = "") {
    const { error } = await supabase.rpc("admin_resolve_report", {
      p_id: id,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw error;
  },
};

export default ReportService;