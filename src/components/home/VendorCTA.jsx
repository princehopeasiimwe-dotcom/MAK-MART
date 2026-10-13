import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function VendorCTA() {
  return (
    <section className="mm-cta">
      <div className="mm-cta__inner mm-container">
        <span className="mm-eyebrow mm-eyebrow--light">
          MADE SOMETHING? SELL SOMETHING.
        </span>

        <h2>Your hustle deserves a storefront.</h2>

        <p>
          Join the MAK MART community and reach students right around you.
        </p>

        <Link to="/vendor/signup" className="mm-btn mm-btn--primary mm-btn--wide">
          Start selling on MAK MART
          <ArrowRight size={20} />
        </Link>
      </div>
    </section>
  );
}

export default VendorCTA;