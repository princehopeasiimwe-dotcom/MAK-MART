import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  MoreVertical,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import Brand from "./Brand";
import NotificationBell from "../common/NotificationBell";
import useAuth from "../../hooks/useAuth";
import { useCart } from "../../context/CartContext";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const { user, isAdmin, isVendor, isServiceProvider, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const marketRef = useRef(null);

  // Close menus whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    setMarketOpen(false);
  }, [location.pathname]);

  // Close the Marketplace dropdown when clicking elsewhere.
  useEffect(() => {
    const onClick = (event) => {
      if (marketRef.current && !marketRef.current.contains(event.target)) {
        setMarketOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("search")?.trim();
    navigate(
      query
        ? `/marketplace/products?search=${encodeURIComponent(query)}`
        : "/marketplace/products"
    );
  };

  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : isVendor
    ? "/vendor/dashboard"
    : isServiceProvider
    ? "/provider/dashboard"
    : null;

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  return (
    <header className="mm-header">
      <div className="mm-header__main mm-container">
        <Brand />

        <form className="mm-search" onSubmit={handleSearch} role="search">
          <Search size={20} aria-hidden="true" />
          <input
            name="search"
            type="search"
            placeholder="Search products, services and more..."
            aria-label="Search"
          />
          <button type="submit">Search</button>
        </form>

        <div className="mm-header__actions">
          {user && <NotificationBell />}

          <Link
            to={user ? "/account" : "/login"}
            className="mm-icon-button mm-header__wide-only"
            aria-label={user ? "My account" : "Sign in"}
          >
            <User size={23} />
          </Link>

          <Link to="/cart" className="mm-icon-button mm-header__wide-only" aria-label="Shopping cart">
            <ShoppingBag size={23} />
            {cartCount > 0 && <b className="mm-badge">{cartCount}</b>}
          </Link>

          <button
            type="button"
            className="mm-icon-button mm-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={26} />
          </button>
        </div>
      </div>

      <nav className="mm-nav" aria-label="Main">
        <div className="mm-nav__scroll mm-container">
          <NavLink to="/" end className="mm-nav__link">
            Home
          </NavLink>

          <div className="mm-nav__dropdown" ref={marketRef}>
            <NavLink
              to="/marketplace/products"
              className="mm-nav__link"
              onClick={() => setMarketOpen(false)}
            >
              Marketplace
            </NavLink>
            <button
              type="button"
              className="mm-nav__chevron"
              aria-label="Marketplace menu"
              aria-expanded={marketOpen}
              onClick={() => setMarketOpen((open) => !open)}
            >
              <ChevronDown size={16} />
            </button>

            {marketOpen && (
              <div className="mm-dropdown">
                <Link to="/marketplace/products">Browse products</Link>
                <Link to="/marketplace/vendors">Student vendors</Link>
                <Link to="/marketplace/events">Campus events</Link>
              </div>
            )}
          </div>

          <NavLink to="/services" className="mm-nav__link">
            Services
          </NavLink>
          <NavLink to="/marketplace/events" className="mm-nav__link">
            Events
          </NavLink>
          <NavLink to="/marketplace/vendors" className="mm-nav__link">
            Vendors
          </NavLink>
        </div>
      </nav>

      {menuOpen && (
        <div className="mm-menu mm-container">
          {user ? (
            <>
              <Link to="/account">My account</Link>
              {dashboardPath && <Link to={dashboardPath}>My dashboard</Link>}
              <button type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup">Create an account</Link>
            </>
          )}
          {!isVendor && <Link to="/vendor/signup">Become a vendor</Link>}
          {!isServiceProvider && <Link to="/provider/signup">Offer a service</Link>}
        </div>
      )}
    </header>
  );
}

export default Navbar;