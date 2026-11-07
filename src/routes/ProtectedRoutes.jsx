import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loader from "../components/common/loader";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader message="Loading MAK MART..." />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const isAdminRoute = allowedRoles.includes("admin");

  // Real admins (verified against the admins table, the same
  // source RLS uses) can access any protected route, regardless
  // of their profile.role label.
  if (isAdminRoute && isAdmin) {
    return children;
  }

  // Admin-only routes require real admin status - a profile.role
  // of "admin" alone isn't enough, since that label can drift out
  // of sync with actual admins-table membership.
  if (isAdminRoute && allowedRoles.length === 1) {
    return <Navigate to="/" replace />;
  }

  // If the profile failed to load, or the role isn't allowed here,
  // keep the user out (fail closed).
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(profile?.role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;