import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// "Back to home" link shown at the top of every login / signup /
// password screen, so nobody is ever stuck on an auth page.
function AuthBack({ to = "/", label = "Back to home" }) {
  return (
    <Link to={to} className="auth-back">
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}

export default AuthBack;