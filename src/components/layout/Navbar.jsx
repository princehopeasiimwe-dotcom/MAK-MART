import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Menu, X, Search, ShoppingCart, Store, User, MapPin, ChevronDown
} from "lucide-react";
import { useCart } from "../../context/CartContext";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar jumia-navbar">
      <div className="jumia-topbar">
        <div className="navbar__container">
          <span>Welcome to MAK MART — Makerere's student marketplace</span>
          <div className="jumia-topbar__links">
            <Link to="/vendor/signup">Sell on MAK MART</Link>
            <Link to="/marketplace/vendors">Discover vendors</Link>
            <Link to="/services">Campus services</Link>
          </div>
        </div>
      </div>

      <div className="navbar__container navbar__main">
        <Link to="/" className="navbar__brand" onClick={closeMenu}>
          <div className="navbar__logo">
            <img src="src/assets/logos/mak mart logo.png" alt="MAK MART Logo" />
          </div>
          <div className="navbar__brand-text">
            <strong>MAK MART</strong>
            <span>Makerere Marketplace</span>
          </div>
        </Link>

        <form
          className="navbar__search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new FormData(event.currentTarget).get("search");
            window.location.href = query?.trim()
              ? `/marketplace/products?search=${encodeURIComponent(query.trim())}`
              : "/marketplace/products";
          }}
        >
          <Search size={19} />
          <input name="search" type="search" placeholder="Search products, brands and services..." />
          <button type="submit">Search</button>
        </form>

        <nav className="navbar__nav">
          <NavLink to="/" end className="navbar__link">Home</NavLink>
          <NavLink to="/marketplace/products" className="navbar__link">Market</NavLink>
          <NavLink to="/marketplace/events" className="navbar__link">Events</NavLink>
          <NavLink to="/services" className="navbar__link">Services</NavLink>
          <NavLink to="/marketplace/vendors" className="navbar__link">Vendors</NavLink>
        </nav>

        <div className="navbar__actions">
          <Link to="/vendor/login" className="navbar__account">
            <User size={19} />
            <span>Account</span>
            <ChevronDown size={14} />
          </Link>

          <Link to="/cart" className="navbar__cart" aria-label="Shopping cart">
            <span className="navbar__cart-icon">
              <ShoppingCart size={21} />
              {cartCount > 0 && <b>{cartCount}</b>}
            </span>
            <span>Cart</span>
          </Link>

          <Link to="/vendor/signup" className="navbar__vendor-button">
            <Store size={17} />
            Sell
          </Link>
        </div>

        <button type="button" className="navbar__menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation menu">
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </div>

      <div className="jumia-categorybar">
        <div className="navbar__container">
          <Link to="/marketplace/products" className="jumia-categorybar__all">
            <Menu size={18} /> Categories
          </Link>
          <Link to="/marketplace/products?category=fashion">Fashion</Link>
          <Link to="/marketplace/products?category=beauty">Beauty</Link>
          <Link to="/marketplace/products?category=food">Food</Link>
          <Link to="/marketplace/products?category=technology">Phones & Tech</Link>
          <Link to="/marketplace/products?category=books">Books</Link>
          <Link to="/services">Services</Link>
          <span className="jumia-location"><MapPin size={15} /> Makerere University</span>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar__mobile-menu">
          <nav className="navbar__mobile-nav">
            <NavLink to="/" end onClick={closeMenu} className="navbar__mobile-link">Home</NavLink>
            <NavLink to="/marketplace/products" onClick={closeMenu} className="navbar__mobile-link">Market</NavLink>
            <NavLink to="/marketplace/events" onClick={closeMenu} className="navbar__mobile-link">Events</NavLink>
            <NavLink to="/services" onClick={closeMenu} className="navbar__mobile-link">Services</NavLink>
            <NavLink to="/marketplace/vendors" onClick={closeMenu} className="navbar__mobile-link">Vendors</NavLink>
            <NavLink to="/cart" onClick={closeMenu} className="navbar__mobile-link">Cart ({cartCount})</NavLink>
          </nav>
          <div className="navbar__mobile-actions">
            <Link to="/vendor/login" onClick={closeMenu} className="navbar__mobile-login"><User size={18} /> Vendor Login</Link>
            <Link to="/vendor/signup" onClick={closeMenu} className="navbar__mobile-vendor"><Store size={18} /> Become a Vendor</Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
