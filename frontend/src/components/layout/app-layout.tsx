import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="md:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
