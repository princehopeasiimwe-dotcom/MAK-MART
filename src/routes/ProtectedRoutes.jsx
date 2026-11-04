import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loader from "../components/common/loader";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, profile, isAdmin, isVendor, isServiceProvider, loading } = useAuth();
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

  // What this account can do comes from what it actually owns (a vendors /
  // service_providers row), not just the single profile.role label. One
  // account can be a vendor AND a service provider, and the label drifts out
  // of sync (or is briefly empty if the profile fetch was slow), which used
  // to lock real vendors/providers out of their own dashboard.
  if (allowedRoles.length > 0) {
    const roles = new Set();
    if (profile?.role) roles.add(profile.role);
    if (isVendor) roles.add("vendor");
    if (isServiceProvider) roles.add("service_provider");

    if (!allowedRoles.some((role) => roles.has(role))) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;