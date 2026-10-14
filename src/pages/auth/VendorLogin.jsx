import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthBack from "../../components/common/AuthBack";
import { supabase } from "../../lib/supabase";
import { getHomePathForUser } from "../../lib/authRedirect";

// One login screen for everybody (customers, vendors, service
// providers, admins). Served at /login, /vendor/login and
// /provider/login. After signing in, each user is sent to their
// own dashboard (or back to the page they came from).
import usePageSeo from "../../hooks/usePageSeo";

function VendorLogin() {
  usePageSeo({ title: "Login", noindex: true });

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const homePath = await getHomePathForUser(data.user.id);
    const from = location.state?.from;

    setLoading(false);
    navigate(from && from !== "/login" ? from : homePath, {
      replace: true,
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <AuthBack />

        <span className="eyebrow">WELCOME BACK</span>

        <h1>Login</h1>

        <p>Sign in to your MAK MART account.</p>

        {location.state?.message && (
          <div className="form-success">{location.state.message}</div>
        )}

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/reset-password">Forgot password?</Link>

          <p>
            New here? <Link to="/signup">Create an account</Link>
          </p>

          <p>
            Want to sell? <Link to="/vendor/signup">Become a vendor</Link>
            {" · "}
            <Link to="/provider/signup">Offer a service</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default VendorLogin;