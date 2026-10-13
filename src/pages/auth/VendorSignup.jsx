import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBack from "../../components/common/AuthBack";
import { supabase } from "../../lib/supabase";

// Signup for sellers. accountType is "vendor" (sells products) or
// "service_provider" (offers services). The vendor / provider
// record is created by the database from the signup metadata
// (see migration 012), so this works whether or not email
// confirmation is switched on in Supabase. New accounts always
// start unapproved until an admin activates them.
function VendorSignUp({ accountType = "vendor" }) {
  const navigate = useNavigate();
  const isProvider = accountType === "service_provider";

  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    location: "Main Campus",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          account_type: accountType,
          full_name: form.business_name,
          business_name: form.business_name,
          phone: form.phone,
          location: form.location,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // With email confirmation on there is no session yet.
    const needsConfirmation = !data.session;

    if (!needsConfirmation) {
      await supabase.auth.signOut();
    }

    navigate("/login", {
      state: {
        message: needsConfirmation
          ? "Account created. Please confirm your email, then log in. Your account will go live once an admin approves it."
          : "Account created. Your account is awaiting admin approval.",
      },
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--wide">
        <AuthBack />

        <span className="eyebrow">JOIN MAK MART</span>

        <h1>{isProvider ? "Offer your service" : "Create your store"}</h1>

        <p>
          {isProvider
            ? "Reach students and staff across the Makerere University community."
            : "Start selling to the Makerere University community."}
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="su-business">Business name</label>
              <input
                id="su-business"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-phone">WhatsApp / phone number</label>
              <input
                id="su-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+256..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-location">Campus / location</label>
              <input
                id="su-location"
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-email">Email</label>
              <input
                id="su-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="su-password">Password</label>
              <input
                id="su-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                minLength="8"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : isProvider
                ? "Create Provider Account"
                : "Create Vendor Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Login here</Link>
        </p>
      </div>
    </section>
  );
}

export default VendorSignUp;