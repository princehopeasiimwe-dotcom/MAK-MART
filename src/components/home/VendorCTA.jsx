import { ArrowRight, Store } from "lucide-react";
import { Link } from "react-router-dom";

function VendorCTA() {
  return (
    <section className="vendor-cta">
      <div className="vendor-cta__content">
        <div className="vendor-cta__icon">
          <Store size={30} />
        </div>

        <span className="eyebrow eyebrow--light">
          ARE YOU A STUDENT ENTREPRENEUR?
        </span>

        <h2>
          Turn your hustle
          <br />
          into a storefront.
        </h2>

        <p>
          Create your vendor account, upload products
          and reach the Makerere University community
          through MAK MART.
        </p>

        <Link
          to="/vendor/signup"
          className="vendor-cta__button"
        >
          Start selling on MAK MART
          <span className="sr-only">Start selling on MAK MART</span>
          <ArrowRight size={19} />
        </Link>
      </div>
    </section>
  );
}

export default VendorCTA;