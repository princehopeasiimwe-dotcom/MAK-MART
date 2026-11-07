import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { becomeSeller, isMissingFunction } from "../../lib/seller";

// Open a store (sell products) on the account that is signed in. Works for
// shoppers and service providers alike: one tap, we reuse the business name,
// phone and location the account already has. An approval the account already
// has (for example a live services profile) is carried over by the database.
function SellProductsCard() {
  const { user, vendor, serviceProvider, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

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

  const known = serviceProvider?.business_name || "";

  const start = async (event) => {
    event?.preventDefault?.();
    if (!user?.id) return;

    const businessName = (known || name || "").trim();
    if (!businessName) {
      setError("Please enter a name for your store.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await becomeSeller("vendor", {
        userId: user.id,
        businessName,
        phone: serviceProvider?.phone || profile?.phone || "",
        location: serviceProvider?.location || "",
      });
      await refreshProfile?.();
      navigate("/vendor/products");
    } catch (err) {
      setError(
        isMissingFunction(err)
          ? "This isn't switched on yet. The site admin needs to run the latest database update."
          : err.message || "Could not open your store. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="insights-card offer-service" onSubmit={start}>
      <h2><Store size={20} /> {serviceProvider ? "Sell products too" : "Open a store"}</h2>
      <p>
        {serviceProvider
          ? "Want to sell items as well as services? Open a store on this same account. We reuse your business name and phone, and your approval carries over. Your services stay exactly as they are."
          : "Sell products to the Makerere community from this same account. No new sign-up needed. An admin approves your store before it goes live."}
      </p>

      {!known && (
        <div className="form-group">
          <label htmlFor="store-name">Store name</label>
          <input
            id="store-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={profile?.full_name || "e.g. Campus Gadgets"}
            required
          />
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="primary-button" disabled={busy}>
        {busy ? "Opening your store..." : "Open my store"}
      </button>
    </form>
  );
}

export default SellProductsCard;
