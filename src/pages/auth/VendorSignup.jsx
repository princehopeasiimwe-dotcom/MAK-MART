import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";

function VendorSignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    location: "Main Campus",
    email: "",
    password: "",
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: authError } =
      await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.business_name,
          },
        },
      });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError(
        "Check your email to confirm your account, then log in to finish setting up your store."
      );
      setLoading(false);
      return;
    }

    // The handle_new_user trigger already created a `profiles`
    // row with role='customer' - promote it to 'vendor'.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "vendor",
        phone: form.phone,
      })
      .eq("id", data.user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: vendorError } =
      await supabase
        .from("vendors")
        .insert({
          owner_id: data.user.id,
          business_name: form.business_name,
          phone: form.phone,
          location: form.location,
        });

    if (vendorError) {
      setError(vendorError.message);
      setLoading(false);
      return;
    }

    navigate("/vendor/login", {
      state: {
        message:
          "Account created successfully. Your vendor account is awaiting approval.",
      },
    });
  };

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--wide">
        <span className="eyebrow">
          JOIN KU MARKET
        </span>

        <h1>Create your store</h1>

        <p>
          Start selling to the Makerere University
          community.
        </p>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Business name</label>

              <input
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>WhatsApp / phone number</label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+256..."
                required
              />
            </div>

            <div className="form-group">
              <label>Campus / location</label>

              <input
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                minLength="6"
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
              ? "Creating store..."
              : "Create Vendor Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{" "}
          <Link to="/vendor/login">
            Login here
          </Link>
        </p>
      </div>
    </section>
  );
}

export default VendorSignUp;
