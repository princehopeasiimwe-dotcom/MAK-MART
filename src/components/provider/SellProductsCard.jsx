import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

// Lets a service provider also sell products, from the same account. One tap:
// we reuse the business name, phone and location they already gave us.
function SellProductsCard() {
  const { user, vendor, serviceProvider, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!serviceProvider) return null;

  if (vendor) {
    return (
      <div className="insights-card offer-service">
        <h2><Store size={20} /> Your store</h2>
        <p>
          {vendor.is_active
            ? "Your store is live. Add and manage the products you sell."
            : "Your store is waiting for admin approval. Add your products now; they go live once approved."}
        </p>
        <button type="button" className="primary-button" onClick={() => navigate("/vendor/products")}>
          Manage my products
        </button>
      </div>
    );
  }

  const start = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("become_seller", {
        p_type: "vendor",
        p_business_name: serviceProvider.business_name || profile?.full_name || "My store",
        p_phone: serviceProvider.phone || profile?.phone || "",
        p_location: serviceProvider.location || "",
      });
      if (rpcError) throw rpcError;
      await refreshProfile?.();
      navigate("/vendor/products");
    } catch (err) {
      setError(
        /function|schema cache|does not exist/i.test(err.message || "")
          ? "This isn't switched on yet. The site admin needs to run the latest database update."
          : err.message || "Could not open your store. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="insights-card offer-service">
      <h2><Store size={20} /> Sell products too</h2>
      <p>
        Want to sell items as well as services? Open a store on this same account. We reuse your business
        name and phone, and an admin approves it before it goes live. Your services stay exactly as they are.
      </p>
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="primary-button" onClick={start} disabled={busy}>
        {busy ? "Opening your store..." : "Open my store"}
      </button>
    </div>
  );
}

export default SellProductsCard;