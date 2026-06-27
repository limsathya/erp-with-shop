import { Link, Outlet } from "react-router-dom";
import { ShoppingCart, User, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopAuthProvider, useShopAuth } from "@/context/shop-auth-context";
import { CartProvider, useCart } from "@/context/cart-context";

// ── Header component (lives inside the providers so it can read context) ──

function ShopHeader() {
  const { customer, logout } = useShopAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        {/* Logo */}
        <Link
          to="/shop"
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <Store className="h-5 w-5 text-primary" />
          <span className="text-base">ERP Store</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cart */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/shop/cart" aria-label={`Cart (${count} items)`}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        </Button>

        {/* Account */}
        {customer ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/shop/orders">
                <User className="mr-1.5 h-4 w-4" />
                {customer.name.split(" ")[0]}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sign out"
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/shop/login">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

// ── Layout wrapper — provides shop contexts and renders Outlet ─────────────

export function ShopLayout() {
  return (
    <ShopAuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-background">
          <ShopHeader />

          <main className="mx-auto max-w-5xl px-4 py-8">
            <Outlet />
          </main>

          <footer className="border-t py-6 text-center text-xs text-muted-foreground">
            <span className="mr-3">© {new Date().getFullYear()} ERP Store</span>
            <span className="mx-1">·</span>
            <a href="/login" className="ml-3 hover:underline hover:text-foreground">
              Staff login →
            </a>
          </footer>
        </div>
      </CartProvider>
    </ShopAuthProvider>
  );
}
