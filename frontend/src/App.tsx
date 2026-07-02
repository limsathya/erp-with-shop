import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { RoleRoute } from "@/components/role-route";
import { AppLayout } from "@/components/layout/app-layout";
import { ShopLayout } from "@/components/layout/shop-layout";
import { Toaster } from "@/components/ui/sonner";

// ERP auth
import LoginPage from "@/pages/login";

// ERP dashboards
import DashboardRouter from "@/pages/dashboard";
import StorePage from "@/pages/store";
import StoresPage from "@/pages/stores";
import VisitsPage from "@/pages/visits";
import ProductsPage from "@/pages/products";
import InvoicesPage from "@/pages/invoices";
import InvoiceViewPage from "@/pages/invoice-view";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import SettingsPage from "@/pages/settings";
import UsersPage from "@/pages/users";

// Public shop pages (no ERP auth required)
import ShopHomePage from "@/pages/shop/index";
import ShopProductPage from "@/pages/shop/product";
import ShopCartPage from "@/pages/shop/cart";
import ShopLoginPage from "@/pages/shop/login";
import ShopOrdersPage from "@/pages/shop/orders";
import ShopOrderDetailPage from "@/pages/shop/order-detail";
import ShopOrderSuccessPage from "@/pages/shop/order-success";
import ShopCustomerDashboard from "@/pages/shop/dashboard";

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public shop — the main storefront ── */}
              <Route element={<ShopLayout />}>
                <Route path="/" element={<ShopHomePage />} />
                <Route path="/shop" element={<Navigate to="/" replace />} />
                <Route path="/shop/products/:id" element={<ShopProductPage />} />
                <Route path="/shop/cart" element={<ShopCartPage />} />
                <Route path="/shop/login" element={<ShopLoginPage />} />
                <Route path="/shop/orders" element={<ShopOrdersPage />} />
                <Route path="/shop/orders/:id" element={<ShopOrderDetailPage />} />
                <Route path="/shop/order-success" element={<ShopOrderSuccessPage />} />
                <Route path="/shop/dashboard" element={<ShopCustomerDashboard />} />
              </Route>

              {/* ── ERP staff login ── */}
              <Route path="/login" element={<LoginPage />} />

              {/* ── ERP dashboards (role-specific) ── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardRouter />} />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/invoices/:id" element={<InvoiceViewPage />} />
                  <Route path="/customers" element={<CustomersPage />} />

                  {/* Manager + Admin only */}
                  <Route element={<RoleRoute roles={["MANAGER", "ADMIN"]} />}>
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/stores" element={<StoresPage />} />
                    <Route path="/visits" element={<VisitsPage />} />
                  </Route>

                  {/* Admin only */}
                  <Route element={<RoleRoute roles={["ADMIN"]} />}>
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                </Route>
              </Route>

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
