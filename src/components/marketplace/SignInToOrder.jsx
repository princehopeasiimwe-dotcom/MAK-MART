import { useLocation, useNavigate } from "react-router-dom";
import { UserPlus, LogIn } from "lucide-react";

import Modal from "../common/modal";
import { rememberReturnTo } from "../../lib/returnTo";

// Shown instead of the order form when the shopper isn't signed in.
function SignInToOrder({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    const from = `${location.pathname}${location.search}`;
    rememberReturnTo(from);
    navigate(path, { state: { from } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create an account to order">
      <div className="signin-to-order">
        <p>
          To place an order you first need a free MAK MART account. It takes about a minute, and
          you'll come straight back here to message the seller on WhatsApp.
        </p>
        <p className="field-hint">
          An account also lets you track your orders, confirm delivery and rate sellers.
        </p>

        <button type="button" className="primary-button full-width" onClick={() => go("/signup")}>
          <UserPlus size={18} /> Create an account
        </button>
        <button type="button" className="secondary-button full-width" onClick={() => go("/login")}>
          <LogIn size={18} /> I already have an account
        </button>
      </div>
    </Modal>
  );
}

export default SignInToOrder;