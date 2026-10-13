import { NavLink } from "react-router-dom";
import { Home, LayoutGrid, ShoppingBag, User, Wrench } from "lucide-react";
import { useCart } from "../../context/CartContext";

// Fixed bottom navigation, phones only (hidden on wider screens by CSS).
function MobileTabBar() {
  const { cartCount } = useCart();

  const tabs = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/marketplace/products", label: "Market", icon: LayoutGrid },
    { to: "/services", label: "Services", icon: Wrench },
    { to: "/cart", label: "Cart", icon: ShoppingBag, badge: cartCount },
    { to: "/account", label: "Account", icon: User },
  ];

  return (
    <nav className="mm-tabbar" aria-label="Quick navigation">
      {tabs.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink key={to} to={to} end={end} className="mm-tabbar__item">
          <span className="mm-tabbar__icon">
            <Icon size={24} />
            {badge > 0 && <b className="mm-badge">{badge}</b>}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileTabBar;