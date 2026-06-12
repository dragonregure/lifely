import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-background" label="Loading workspace" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
