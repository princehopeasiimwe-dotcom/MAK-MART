import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

// Lets a vendor who sells products also offer services, without a second account.
function OfferServiceCard({ compact = false }) {
  const { user, vendor, serviceProvider, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (serviceProvider) {
    if (compact) return null;
    return (
      <div className="insights-card offer-service">
        <h2><Wrench size={20} /> Your services</h2>
        <p>
          {serviceProvider.is_active
            ? "Your services are live. Customers can request them and you'll see requests here."
            : "Your services profile is waiting for admin approval. Add your services now; they go live once approved."}
        </p>
        <button type="button" className="primary-button" onClick={() => navigate("/provider/services")}>
          Manage my services
        </button>
      </div>
    );
  }

  const start = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError("");
    try {
      const { error: insertError } = await supabase.from("service_providers").insert({
        owner_id: user.id,
        business_name: vendor?.business_name || "My services",
        phone: vendor?.phone || null,
        location: vendor?.location || null,
        description: null,
      });
      if (insertError) throw insertError;
      await refreshProfile();
      navigate("/provider/services");
    } catch (err) {
      setError(err.message || "Could not set up services. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="insights-card offer-service">
      <h2><Wrench size={20} /> Offer a service too</h2>
      <p>
        Tutoring, printing, hair, repairs... You can offer services from this same account. We reuse your
        store name and phone, and an admin approves it before it goes live.
      </p>
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="primary-button" onClick={start} disabled={busy}>
        {busy ? "Setting up..." : "Start offering services"}
      </button>
    </div>
  );
}

export default OfferServiceCard;