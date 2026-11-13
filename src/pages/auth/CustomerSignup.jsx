import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { takeReturnTo } from "../../lib/returnTo";
import PasswordField from "../../components/common/PasswordField";
import AuthBack from "../../components/common/AuthBack";
import { supabase } from "../../lib/supabase";

// Buyer account. Optional - shoppers can still order through
// WhatsApp as guests - but a signed-in buyer gets an order record.
import usePageSeo from "../../hooks/usePageSeo";

function CustomerSignup() {
  usePageSeo({ title: "Create account", noindex: true });

  const navigate = useNavigate();
  const location = useLocation();
  const cameFrom = location.state?.from;

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
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
          account_type: "customer",
          full_name: form.full_name,
          phone: form.phone,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.session) {
      navigate(takeReturnTo(cameFrom) || "/", { replace: true });
      return;
    }

    navigate("/login", {
      state: {
        from: cameFrom,
        message: "Account created. Please confirm your email, then log in.",
      },
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <AuthBack />

        <span className="eyebrow">JOIN MAK MART</span>

        <h1>Create an account</h1>

        <p>Track your orders and check out faster.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cs-name">Full name</label>
            <input
              id="cs-name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cs-phone">Phone number</label>
            <input
              id="cs-phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+256..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="cs-email">Email</label>
            <input
              id="cs-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cs-password">Password</label>
            <PasswordField
              id="cs-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              minLength="8"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login" state={{ from: cameFrom }}>Login here</Link>
        </p>
      </div>
    </section>
  );
}

export default CustomerSignup;