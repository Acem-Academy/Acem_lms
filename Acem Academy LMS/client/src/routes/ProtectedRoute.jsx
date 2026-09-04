import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/config/routes";

function ProtectedRoute({ children, roles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;