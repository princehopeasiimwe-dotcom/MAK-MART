import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loader from "../components/common/loader";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader text="Loading KU Market..." />;
  }

  if (!user) {
    return (
      <Navigate
        to="/vendor/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    profile?.role &&
    !allowedRoles.includes(profile.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;