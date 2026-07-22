"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/utils";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Product { id: string; sku: string; name: string; price: string | number; stock: number }
interface CartItem { productId: string; name: string; price: number; quantity: number }

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState<"USD"|"KHR">("USD");

  useEffect(() => {
    api.get("/products", { params: { search: search || undefined, pageSize: 50 } }).then(({ data }) => setProducts(data.items));
  }, [search]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: Number(p.price), quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      const { data } = await api.post("/invoices", {
        currency,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      toast.success(`Invoice ${data.number} created`);
      setCart([]);
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Point of Sale</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Product list */}
        <div className="lg:col-span-2 space-y-4">
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
            {products.map((p) => (
              <Button key={p.id} variant="outline" className="h-auto flex-col items-start p-3 gap-1" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{formatMoney(p.price)} · Stock: {p.stock}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Cart ({cart.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={currency} onValueChange={(v) => setCurrency(v as "USD"|"KHR")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="KHR">KHR</SelectItem></SelectContent>
            </Select>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.name}</p><p className="text-xs text-muted-foreground">{formatMoney(item.price)}</p></div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.productId, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatMoney(subtotal, currency)}</span></div>
            </div>

            <Button className="w-full" size="lg" onClick={checkout} disabled={cart.length === 0}>Checkout</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
