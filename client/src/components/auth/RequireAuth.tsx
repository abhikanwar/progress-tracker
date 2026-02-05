import { Navigate, useLocation } from "react-router-dom";
import { authStorage } from "../../lib/auth";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  if (!authStorage.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};
