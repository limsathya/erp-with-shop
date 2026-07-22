"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  LayoutDashboard, ShoppingBag, FileText, Users, Truck, Store, CalendarCheck,
  Settings, UserCog, Package, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/store", label: "POS", icon: ShoppingBag, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/products", label: "Products", icon: Package, roles: ["ADMIN", "MANAGER"] },
  { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN", "MANAGER"] },
  { href: "/stores", label: "Stores", icon: Store, roles: ["ADMIN", "MANAGER"] },
  { href: "/visits", label: "Visits", icon: CalendarCheck, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/users", label: "Users", icon: UserCog, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER"] },
];

export function ErpLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="text-lg font-bold">☕ ERP</Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></Button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
              <Button variant={pathname === item.href ? "secondary" : "ghost"} className="w-full justify-start">
                <item.icon className="h-4 w-4 mr-2" />{item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            {user && <span className="text-sm text-muted-foreground">{user.name} ({user.role})</span>}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
