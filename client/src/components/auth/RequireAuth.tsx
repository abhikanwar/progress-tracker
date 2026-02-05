import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authStorage } from "../../lib/auth";

export const RequireAuth = ({ children }: { children: ReactElement }) => {
  const location = useLocation();
  if (!authStorage.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};
