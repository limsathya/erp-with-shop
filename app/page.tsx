"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useEffect, useState } from "react";
import shopApi from "@/lib/shop-api";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useShopAuth } from "@/components/shop-auth-context";
import { ShoppingCart, Search, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";

interface Product {
  id: string; sku: string; name: string; nameKm?: string; nameZh?: string;
  price: string | number; stock: number; imageUrl?: string; category?: { id: string; name: string };
}

interface Category { id: string; name: string }

export default function ShopPage() {
  const { t, i18n } = useTranslation();
  const { addItem, count } = useCart();
  const { customer, logout } = useShopAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [catId, setCatId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopApi.get("/products", { params: { search: search || undefined, categoryId: catId || undefined } })
      .then(({ data }) => setProducts(data.items))
      .finally(() => setLoading(false));
    shopApi.get("/categories").then(({ data }) => setCategories(data.items));
  }, [search, catId]);

  const displayName = (p: Product) => {
    if (i18n.language === "km" && p.nameKm) return p.nameKm;
    if (i18n.language === "zh" && p.nameZh) return p.nameZh;
    return p.name;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold">☕ ERP Store</Link>
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("search_products") || "Search products..."} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            <Link href="/shop/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{count}</span>}
              </Button>
            </Link>
            {customer ? (
              <div className="flex items-center gap-2">
                <Link href="/shop/orders"><Button variant="ghost" size="sm"><User className="h-4 w-4 mr-1" />{customer.name}</Button></Link>
                <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Link href="/shop/login"><Button variant="ghost" size="sm">{t("sign_in") || "Sign In"}</Button></Link>
            )}
          </div>
        </div>
      </header>

      {/* Category filter */}
      <div className="container mx-auto px-4 py-4 flex gap-2 flex-wrap">
        <Button variant={catId === "" ? "default" : "outline"} size="sm" onClick={() => setCatId("")}>{t("all") || "All"}</Button>
        {categories.map((c) => (
          <Button key={c.id} variant={catId === c.id ? "default" : "outline"} size="sm" onClick={() => setCatId(c.id)}>{c.name}</Button>
        ))}
      </div>

      {/* Products grid */}
      <main className="flex-1 container mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><div className="aspect-square bg-muted animate-pulse rounded-lg" /><div className="h-4 bg-muted animate-pulse rounded mt-3" /><div className="h-4 bg-muted animate-pulse rounded mt-2 w-1/2" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <Link key={p.id} href={`/shop/products/${p.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-t-lg overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2">{displayName(p)}</h3>
                      <p className="text-sm text-muted-foreground">{p.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold">{formatMoney(p.price)}</span>
                        <Button size="sm" onClick={(e) => { e.preventDefault(); addItem({ productId: p.id, name: p.name, price: Number(p.price), imageUrl: p.imageUrl }); toast.success("Added to cart"); }}>
                          {t("add_to_cart") || "Add"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <Link href="/login" className="hover:underline">{t("staff_login") || "Staff Login →"}</Link>
        </div>
      </footer>
    </div>
  );
}
