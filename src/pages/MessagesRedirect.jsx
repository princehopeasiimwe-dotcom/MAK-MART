import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loader from "../components/common/loader";

// /messages?c=... (used by notifications) -> the right dashboard for this person.
function MessagesRedirect() {
  const { user, dashboardPath, loading } = useAuth();
  const { search } = useLocation();

  if (loading) return <Loader message="Opening messages..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: `/messages${search}` }} />;

  const base = dashboardPath.replace(/\/dashboard$/, "");
  return <Navigate to={`${base}/messages${search}`} replace />;
}

export default MessagesRedirect;