"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { useShopAuth } from "@/components/shop-auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ShoppingCart, ArrowLeft, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import shopApi from "@/lib/shop-api";
import { useState } from "react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { customer } = useShopAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const { data } = await shopApi.post("/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      clearCart();
      router.push(`/shop/order-success?number=${data.number}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold">☕ ERP Store</Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher /><ModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6"><ArrowLeft className="h-4 w-4 mr-2" />Continue Shopping</Button>
        <h1 className="text-2xl font-bold mb-6">Cart ({items.length} items)</h1>

        {items.length === 0 ? (
          <p className="text-muted-foreground">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.productId}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xl">📦</div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatMoney(item.price)}</p>
                  </div>
                  <div className="flex items-center border rounded">
                    <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</Button>
                  </div>
                  <p className="font-bold min-w-[80px] text-right">{formatMoney(item.price * item.quantity)}</p>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-4 mt-4">
              <div className="text-xl font-bold text-right">Total: {formatMoney(total)}</div>
            </div>

            {!customer && (
              <div className="space-y-3 mt-6">
                <h3 className="font-medium">Your Details</h3>
                <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}

            <Button className="w-full mt-4" size="lg" onClick={placeOrder} disabled={placing}>
              {placing ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
