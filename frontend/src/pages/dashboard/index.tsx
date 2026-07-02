import { useAuth } from "@/context/auth-context";
import AdminDashboard from "./admin-dashboard";
import ManagerDashboard from "./manager-dashboard";
import StaffDashboard from "./staff-dashboard";

export default function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "MANAGER":
      return <ManagerDashboard />;
    case "STAFF":
      return <StaffDashboard />;
    default:
      return null;
  }
}
