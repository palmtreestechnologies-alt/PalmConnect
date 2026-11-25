import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: AppRole }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && !hasRole(role) && !hasRole("super_admin")) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
