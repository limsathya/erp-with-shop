import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, ShoppingCart, Store, Package, FileText, Users, Truck, Settings, Calendar, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import type { User } from "@/context/auth-context";

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  end?: boolean;
  roles?: User["role"][];
};

export const allNavItems: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/store", labelKey: "nav.store", icon: ShoppingCart },
  { to: "/invoices", labelKey: "nav.invoices", icon: FileText },
  { to: "/customers", labelKey: "nav.customers", icon: Users },
  { to: "/visits", labelKey: "nav.visits", icon: Calendar, roles: ["MANAGER", "ADMIN"] },
  { to: "/products", labelKey: "nav.products", icon: Package, roles: ["MANAGER", "ADMIN"] },
  { to: "/stores", labelKey: "nav.stores", icon: Store, roles: ["MANAGER", "ADMIN"] },
  { to: "/suppliers", labelKey: "nav.suppliers", icon: Truck, roles: ["MANAGER", "ADMIN"] },
  { to: "/users", labelKey: "nav.users", icon: ShieldCheck, roles: ["ADMIN"] },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role ?? "STAFF";

  const navItems = allNavItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          E
        </div>
        <span className="text-lg font-semibold">{t("app.title")}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        KHQR · MariaDB · Redis
      </div>
    </aside>
  );
}
