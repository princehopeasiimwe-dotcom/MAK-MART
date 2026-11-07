import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { becomeSeller, isMissingFunction } from "../../lib/seller";

// Offer services on the account that is signed in (shopper or vendor), without
// a second account. A store approval the account already has carries over.
function OfferServiceCard({ compact = false }) {
  const { user, vendor, serviceProvider, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

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

  const known = vendor?.business_name || "";

  const start = async (event) => {
    event?.preventDefault?.();
    if (!user?.id) return;

    const businessName = (known || name || "").trim();
    if (!businessName) {
      setError("Please enter a name for your services.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await becomeSeller("service_provider", {
        userId: user.id,
        businessName,
        phone: vendor?.phone || profile?.phone || "",
        location: vendor?.location || "",
      });
      await refreshProfile?.();
      navigate("/provider/services");
    } catch (err) {
      setError(
        isMissingFunction(err)
          ? "This isn't switched on yet. The site admin needs to run the latest database update."
          : err.message || "Could not set up services. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="insights-card offer-service" onSubmit={start}>
      <h2><Wrench size={20} /> {vendor ? "Offer a service too" : "Offer a service"}</h2>
      <p>
        Tutoring, printing, hair, repairs... You can offer services from this same account.
        {vendor
          ? " We reuse your store name and phone, and your approval carries over."
          : " An admin approves it before it goes live."}
      </p>

      {!known && (
        <div className="form-group">
          <label htmlFor="service-name">Business name</label>
          <input
            id="service-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={profile?.full_name || "e.g. Quick Print Hub"}
            required
          />
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="primary-button" disabled={busy}>
        {busy ? "Setting up..." : "Start offering services"}
      </button>
    </form>
  );
}

export default OfferServiceCard;
