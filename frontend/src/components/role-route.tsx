import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import type { User } from "@/context/auth-context";

interface RoleRouteProps {
  roles: User["role"][];
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
