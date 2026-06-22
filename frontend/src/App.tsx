import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import InvoicesPage from "@/pages/invoices";
import InvoiceViewPage from "@/pages/invoice-view";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import SettingsPage from "@/pages/settings";

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/invoices/:id" element={<InvoiceViewPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
