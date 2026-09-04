import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/config/routes";
import { ROLES } from "@/config/roles";

function PublicRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return children;
  }

  switch (user.role) {
    case ROLES.ADMIN:
      return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />;

    case ROLES.TEACHER:
      return <Navigate to={ROUTES.TEACHER.DASHBOARD} replace />;

    case ROLES.STUDENT:
      return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />;

    default:
      return <Navigate to={ROUTES.LOGIN} replace />;
  }
}

export default PublicRoute;