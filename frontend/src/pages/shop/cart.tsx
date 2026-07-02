import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus, Plus, Trash2, ShoppingBag, Loader2, ArrowLeft, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { shopApi, shopApiError } from "@/lib/shop-api";
import { useCart } from "@/context/cart-context";
import { useShopAuth } from "@/context/shop-auth-context";
import { formatMoney } from "@/lib/utils";

export default function ShopCartPage() {
  const { items, removeItem, updateQty, clear, total, count } = useCart();
  const { customer } = useShopAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Pre-fill when customer signs in
  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
      });
    }
  }, [customer]);

  const isGuest = !customer;
  const canSubmit =
    items.length > 0 &&
    (!isGuest || (form.name.trim().length > 0 && form.email.trim().length > 0));

  const placeOrder = useMutation({
    mutationFn: () =>
      shopApi.post("/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        // Guest-only fields — server ignores these when a customer token is present
        ...(isGuest && {
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
        }),
      }),
    onSuccess: (res) => {
      clear();
      toast.success(`Order ${res.data.number} placed! We'll be in touch.`);
      navigate("/shop/order-success", {
        state: { id: res.data.id, number: res.data.number, total: Number(res.data.total) },
      });
    },
    onError: (e) => toast.error(shopApiError(e)),
  });

  // ── Empty state ──
  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/25" />
        <p className="text-lg font-semibold">Your cart is empty</p>
        <p className="text-sm text-muted-foreground">Add some products to get started.</p>
        <Button asChild>
          <Link to="/shop">
            <ArrowLeft className="h-4 w-4" />
            Browse products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Items ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/shop">
              <ArrowLeft className="h-4 w-4" />
              Continue shopping
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Cart ({count} item{count !== 1 ? "s" : ""})
          </h1>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-3 rounded-xl border bg-card p-4">
              {/* Thumbnail */}
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info + qty */}
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(item.price)} each
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="ml-auto text-sm font-bold">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Summary + checkout ── */}
      <div className="space-y-4">
        {/* Order summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {items.map((i) => (
              <div
                key={i.productId}
                className="flex justify-between text-muted-foreground"
              >
                <span className="max-w-[200px] truncate">
                  {i.name} × {i.quantity}
                </span>
                <span>{formatMoney(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="my-2 border-t pt-2">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatMoney(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {customer ? "Your details" : "Contact information"}
            </CardTitle>
            {!customer && (
              <CardDescription>
                <Link
                  to="/shop/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>{" "}
                to track your order, or continue as guest.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>
                Name{" "}
                {isGuest && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={form.name}
                onChange={set("name")}
                placeholder="Your full name"
                disabled={!!customer}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Email{" "}
                {isGuest && <span className="text-destructive">*</span>}
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                disabled={!!customer}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+855 xx xxx xxx"
                disabled={!!customer}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={() => placeOrder.mutate()}
              disabled={!canSubmit || placeOrder.isPending}
            >
              {placeOrder.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Place order · {formatMoney(total)}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
