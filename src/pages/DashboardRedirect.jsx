import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

// /dashboard -> the right dashboard for whoever is signed in.
function DashboardRedirect() {
  const { dashboardPath } = useAuth();
  return <Navigate to={dashboardPath} replace />;
}

export default DashboardRedirect;
