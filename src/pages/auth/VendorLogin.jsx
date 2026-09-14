import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";

function VendorLogin() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: admin } =
      await supabase
        .from("admins")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

    if (admin) {
      navigate("/admin/dashboard");
    } else {
      navigate("/vendor/dashboard");
    }

    setLoading(false);
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          WELCOME BACK
        </span>

        <h1>Vendor Login</h1>

        <p>
          Manage your KU Market store.
        </p>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/reset-password">
            Forgot password?
          </Link>

          <p>
            Don't have a vendor account?{" "}
            <Link to="/vendor/signup">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default VendorLogin;