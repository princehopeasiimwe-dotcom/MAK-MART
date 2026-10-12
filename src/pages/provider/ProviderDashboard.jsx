import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

function ProviderDashboard() {
  const { serviceProvider } = useAuth();
  const [serviceCount, setServiceCount] = useState(0);

  useEffect(() => {
    if (!serviceProvider?.id) return;

    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("provider_id", serviceProvider.id)
      .then(({ count }) => setServiceCount(count || 0));
  }, [serviceProvider?.id]);

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">SERVICE PROVIDER</span>
          <h1>Welcome{serviceProvider ? `, ${serviceProvider.business_name}` : ""}</h1>
        </div>
      </div>

      {serviceProvider && !serviceProvider.is_active && (
        <div className="form-error">
          Your account is awaiting admin approval. Your services will become
          visible to customers once it is approved.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <Wrench size={22} />
          <strong>{serviceCount}</strong>
          <span>Services listed</span>
        </div>
      </div>
    </section>
  );
}

export default ProviderDashboard;