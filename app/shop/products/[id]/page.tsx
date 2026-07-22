"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import shopApi from "@/lib/shop-api";
import { useCart } from "@/components/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string; sku: string; name: string; nameKm?: string; nameZh?: string;
  description?: string; price: string | number; stock: number; imageUrl?: string;
  category?: { id: string; name: string };
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopApi.get(`/products/${id}`).then(({ data }) => setProduct(data)).finally(() => setLoading(false));
  }, [id]);

  const displayName = (p: Product) => {
    if (i18n.language === "km" && p.nameKm) return p.nameKm;
    if (i18n.language === "zh" && p.nameZh) return p.nameZh;
    return p.name;
  };

  if (loading) return <div className="container mx-auto p-8 text-center">Loading...</div>;
  if (!product) return <div className="container mx-auto p-8 text-center">Product not found</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold">☕ ERP Store</Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            <Link href="/shop/cart"><Button variant="ghost" size="icon"><ShoppingCart className="h-5 w-5" /></Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-8xl">📦</span>}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayName(product)}</h1>
            <p className="text-muted-foreground mt-1">{product.sku}</p>
            {product.category && <p className="text-sm text-muted-foreground mt-1">{product.category.name}</p>}
            <p className="text-3xl font-bold mt-4">{formatMoney(product.price)}</p>
            {product.description && <p className="mt-4 text-muted-foreground">{product.description}</p>}
            <p className="mt-4 text-sm">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
            {product.stock > 0 && (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center border rounded-md">
                  <Button variant="ghost" size="sm" onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
                  <span className="w-12 text-center">{qty}</span>
                  <Button variant="ghost" size="sm" onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</Button>
                </div>
                <Button onClick={() => { addItem({ productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl }, qty); toast.success("Added to cart"); }}>
                  {t("add_to_cart") || "Add to Cart"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
