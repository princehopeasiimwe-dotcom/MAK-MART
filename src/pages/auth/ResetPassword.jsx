import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function ResetPassword() {
  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const redirectTo =
      `${window.location.origin}/vendor/login`;

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "Password reset instructions have been sent to your email."
    );
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">
          ACCOUNT RECOVERY
        </span>

        <h1>Reset Password</h1>

        <p>
          Enter your email and we'll send password
          reset instructions.
        </p>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {message && (
          <div className="form-success">
            {message}
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

          <button
            className="primary-button full-width"
            type="submit"
          >
            Send Reset Link
          </button>
        </form>

        <Link to="/vendor/login">
          Back to login
        </Link>
      </div>
    </section>
  );
}

export default ResetPassword;