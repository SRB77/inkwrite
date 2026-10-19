import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FullScreenSpinner } from "../components/ui/Spinner";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner label="Restoring your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
