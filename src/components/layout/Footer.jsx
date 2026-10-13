import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin } from "lucide-react";
import Brand from "./Brand";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mm-footer">
      <div className="mm-footer__grid mm-container">
        <div className="mm-footer__brand">
          <Brand />

          <p>Student businesses. Campus essentials.</p>
          <p>Your community, all in one place.</p>

          <p className="mm-footer__line">
            <MapPin size={19} aria-hidden="true" />
            Makerere University, Kampala
          </p>

          <p className="mm-footer__line">
            <Mail size={19} aria-hidden="true" />
            <a href="mailto:hello@makmart.com">hello@makmart.com</a>
          </p>

          <div className="mm-footer__socials">
            <a href="#" aria-label="MAK MART on Instagram">
              <Instagram size={19} />
            </a>
            <a href="#" aria-label="MAK MART on Facebook">
              <Facebook size={19} />
            </a>
          </div>
        </div>

        <div className="mm-footer__col">
          <h3>Marketplace</h3>
          <Link to="/marketplace/products">Browse products</Link>
          <Link to="/services">Campus services</Link>
          <Link to="/marketplace/vendors">Student vendors</Link>
          <Link to="/marketplace/events">Campus events</Link>
        </div>

        <div className="mm-footer__col">
          <h3>For our community</h3>
          <Link to="/vendor/signup">Become a vendor</Link>
          <Link to="/vendor/dashboard">Vendor dashboard</Link>
          <Link to="/provider/signup">Service providers</Link>
          <Link to="/account">Your account</Link>
        </div>
      </div>

      <div className="mm-footer__bottom mm-container">
        <p>&copy; {year} MAK MART. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;