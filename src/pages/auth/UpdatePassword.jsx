import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../../components/common/PasswordField";
import AuthBack from "../../components/common/AuthBack";
import { supabase } from "../../lib/supabase";

// Landing page for the link in the password-reset email.
// Supabase signs the user in with a temporary recovery session
// when they arrive here; this form then sets the new password.
import usePageSeo from "../../hooks/usePageSeo";

function UpdatePassword() {
  usePageSeo({ title: "Set new password", noindex: true });

  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session));
      setChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecked(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();

    navigate("/login", {
      replace: true,
      state: { message: "Password updated. Please log in with your new password." },
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <AuthBack />

        <span className="eyebrow">ACCOUNT RECOVERY</span>

        <h1>Choose a new password</h1>

        {!checked && <p>Checking your reset link...</p>}

        {checked && !ready && (
          <>
            <div className="form-error">
              This reset link is invalid or has expired.
            </div>
            <Link to="/reset-password">Request a new link</Link>
          </>
        )}

        {checked && ready && (
          <>
            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="new-password">New password</label>
                <PasswordField
                  id="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength="8"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm password</label>
                <PasswordField
                  id="confirm-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
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
                {loading ? "Saving..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

export default UpdatePassword;