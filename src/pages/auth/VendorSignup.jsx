import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PasswordField from "../../components/common/PasswordField";
import AuthBack from "../../components/common/AuthBack";
import { supabase } from "../../lib/supabase";
import useAuth from "../../hooks/useAuth";
import { rememberReturnTo } from "../../lib/returnTo";

// Signup for sellers. accountType is "vendor" (sells products) or
// "service_provider" (offers services). The vendor / provider
// record is created by the database from the signup metadata
// (see migration 012), so this works whether or not email
// confirmation is switched on in Supabase. New accounts always
// start unapproved until an admin activates them.
import usePageSeo from "../../hooks/usePageSeo";

function VendorSignUp({ accountType = "vendor" }) {
  usePageSeo({ title: accountType === "service_provider" ? "Offer a service" : "Become a vendor" });

  const navigate = useNavigate();
  const location = useLocation();
  const isProvider = accountType === "service_provider";
  const { user, profile, vendor, serviceProvider, loading: authLoading, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    location: "Main Campus",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  // Someone who is already signed in (a shopper) opens a store on the SAME account:
  // no new email or password, just the business details.
  const handleUpgrade = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("become_seller", {
      p_type: accountType,
      p_business_name: form.business_name,
      p_phone: form.phone || profile?.phone || "",
      p_location: form.location,
    });

    if (rpcError) {
      setLoading(false);
      setError(
        /function|schema cache|does not exist/i.test(rpcError.message || "")
          ? "This isn't switched on yet. The site admin needs to run the latest database update."
          : rpcError.message || "Could not create your account. Please try again."
      );
      return;
    }

    await refreshProfile?.();
    setLoading(false);
    navigate(isProvider ? "/provider/dashboard" : "/vendor/dashboard", { replace: true });
  };

  const goLogin = () => rememberReturnTo(location.pathname);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setAlreadyRegistered(false);

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

    // The email already has an account (Supabase says so in one of two ways).
    if (
      /already\s+(been\s+)?registered|already\s+exists/i.test(authError?.message || "") ||
      (!authError && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    ) {
      setAlreadyRegistered(true);
      return;
    }

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

  if (authLoading) {
    return (
      <section className="auth-page">
        <div className="auth-card auth-card--wide"><p>Loading...</p></div>
      </section>
    );
  }

  // Signed in already
  if (user) {
    const existing = isProvider ? serviceProvider : vendor;
    const dashboard = isProvider ? "/provider/dashboard" : "/vendor/dashboard";

    if (existing) {
      return (
        <section className="auth-page">
          <div className="auth-card auth-card--wide">
            <AuthBack />
            <span className="eyebrow">YOU'RE ALL SET</span>
            <h1>{isProvider ? "You already offer services" : "You already have a store"}</h1>
            <p>
              {existing.is_active
                ? "Your account is live."
                : "Your account is waiting for admin approval. It goes live as soon as it is approved."}
            </p>
            <Link className="primary-button full-width" to={dashboard}>Go to my dashboard</Link>
          </div>
        </section>
      );
    }

    return (
      <section className="auth-page">
        <div className="auth-card auth-card--wide">
          <AuthBack />
          <span className="eyebrow">JOIN MAK MART</span>
          <h1>{isProvider ? "Offer your service" : "Create your store"}</h1>
          <p>
            You're already signed in{profile?.full_name ? ` as ${profile.full_name}` : ""}. Add your
            business details and we'll turn this same account into a {isProvider ? "service" : "vendor"}{" "}
            account. No new password needed. An admin approves it before it goes live.
          </p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleUpgrade}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="up-business">Business name</label>
                <input id="up-business" name="business_name" value={form.business_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="up-phone">WhatsApp / phone number</label>
                <input id="up-phone" name="phone" value={form.phone || profile?.phone || ""} onChange={handleChange} placeholder="+256..." required />
              </div>
              <div className="form-group">
                <label htmlFor="up-location">Campus / location</label>
                <input id="up-location" name="location" value={form.location} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" className="primary-button full-width" disabled={loading}>
              {loading ? "Setting up..." : isProvider ? "Start offering services" : "Open my store"}
            </button>
          </form>
        </div>
      </section>
    );
  }

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

        {alreadyRegistered && (
          <div className="form-error" role="alert">
            This email already has a MAK MART account, so you don't need to sign up again.{" "}
            <Link to="/login" onClick={goLogin}>Log in</Link>, then tap{" "}
            {isProvider ? "Offer a service" : "Become a vendor"} again to turn that same account
            into a {isProvider ? "service" : "vendor"} account.
          </div>
        )}

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
              <PasswordField
                id="su-password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength="8"
                autoComplete="new-password"
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