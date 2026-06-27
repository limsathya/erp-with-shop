import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { ShopLayout } from "@/components/layout/shop-layout";
import { Toaster } from "@/components/ui/sonner";

// ERP pages (staff-only)
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import StorePage from "@/pages/store";
import ProductsPage from "@/pages/products";
import InvoicesPage from "@/pages/invoices";
import InvoiceViewPage from "@/pages/invoice-view";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import SettingsPage from "@/pages/settings";

// Public shop pages (no ERP auth required)
import ShopHomePage from "@/pages/shop/index";
import ShopCartPage from "@/pages/shop/cart";
import ShopLoginPage from "@/pages/shop/login";
import ShopOrdersPage from "@/pages/shop/orders";

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public shop — no ERP login required ── */}
              <Route element={<ShopLayout />}>
                <Route path="/shop" element={<ShopHomePage />} />
                <Route path="/shop/cart" element={<ShopCartPage />} />
                <Route path="/shop/login" element={<ShopLoginPage />} />
                <Route path="/shop/orders" element={<ShopOrdersPage />} />
              </Route>

              {/* ── ERP staff login ── */}
              <Route path="/login" element={<LoginPage />} />

              {/* ── ERP (Staff / Manager / CEO only) ── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/invoices/:id" element={<InvoiceViewPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
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
