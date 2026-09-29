import { Link } from "react-router-dom";
import {
  Instagram,
  Facebook,
  Mail,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* BRAND */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <div className="footer__logo-mark">
              <img src="src/assets/logos/mak mart logo.png" alt="MAK MART Logo" />
            </div>

            <div>
              <strong>MAK MART</strong>
              <span>Makerere Marketplace</span>
            </div>
          </Link>

          <p>
            Makerere University's marketplace for
            student entrepreneurs, products, services
            and campus opportunities.
          </p>

          <div className="footer__socials">
            <a
              href="#"
              aria-label="MAK MART Instagram"
            >
              <Instagram size={19} />
            </a>

            <a
              href="#"
              aria-label="MAK MART Facebook"
            >
              <Facebook size={19} />
            </a>

            <a
              href="mailto:hello@kumarket.com"
              aria-label="Email MAK MART"
            >
              <Mail size={19} />
            </a>
          </div>
        </div>

        {/* MARKETPLACE */}
        <div className="footer__column">
          <h3>Marketplace</h3>

          <Link to="/products">
            Browse products
          </Link>

          <Link to="/vendors">
            Student vendors
          </Link>

          <Link to="/services">
            Find services
          </Link>

          <Link to="/events">
            Campus events
          </Link>
        </div>

        {/* SELL */}
        <div className="footer__column">
          <h3>For sellers</h3>

          <Link to="/vendor/signup">
            Become a vendor
          </Link>

          <Link to="/vendor/login">
            Vendor login
          </Link>

          <Link to="/vendor/dashboard">
            Vendor dashboard
          </Link>

          <Link to="/vendor/products">
            Manage products
          </Link>
        </div>

        {/* CONTACT */}
        <div className="footer__column footer__contact">
          <h3>MAK MART</h3>

          <p>
            <MapPin size={17} />
            Makerere University, Kampala
          </p>

          <a href="mailto:hello@makmart.com">
            <Mail size={17} />
            hello@makmart.com
          </a>

          <Link
            to="/vendor/signup"
            className="footer__cta-link"
          >
            Start selling
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>

      <div className="footer__bottom">
        <p>
          © {currentYear} MAK MART. All rights reserved.
        </p>

        <div>
          <Link to="/privacy">
            Privacy
          </Link>

          <Link to="/terms">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;