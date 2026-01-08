import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "super_admin" | "gym_owner" | "staff";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireRole) {
    if (requireRole === "super_admin" && role !== "super_admin") {
      return <Navigate to="/" replace />;
    }
    
    // Staff can only access certain routes
    if (role === "staff" && requireRole !== "staff") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
