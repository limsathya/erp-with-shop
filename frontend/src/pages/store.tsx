import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ImageIcon,
  ShoppingCart,
  Loader2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import type { Product, Customer, Store as StoreType } from "@/types";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [storeId, setStoreId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () =>
      (await api.get("/products", { params: { search, pageSize: 100 } })).data,
  });
  const { data: customerData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data as Customer[],
  });
  const { data: storeData } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => (await api.get("/stores")).data as StoreType[],
  });

  const products: Product[] = data?.items ?? [];
  const customers: Customer[] = customerData ?? [];
  const stores: StoreType[] = storeData ?? [];

  useEffect(() => {
    if (stores.length && !storeId) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0),
    [cart]
  );

  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const checkout = useMutation({
    mutationFn: () =>
      api.post("/invoices", {
        customerId: customerId === "walk-in" ? null : customerId,
        storeId: storeId || null,
        currency,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: Number(i.product.price),
        })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(t("store.invoiceCreated"));
      setCart([]);
      setDiscount("0");
      setTax("0");
      setCustomerId("walk-in");
      setStoreId(stores[0]?.id ?? "");
      navigate(`/invoices/${res.data.id}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div className="flex h-[calc(100vh-4.5rem)] gap-4 overflow-hidden">
      {/* ── Product grid ── */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{t("store.title")}</h1>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const cartItem = cart.find((i) => i.product.id === p.id);
                const outOfStock = p.stock === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={[
                      "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all",
                      "hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      cartItem ? "border-primary ring-1 ring-primary" : "",
                    ].join(" ")}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square w-full bg-muted">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Qty badge */}
                      {cartItem && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                      <span className="line-clamp-2 text-sm font-medium leading-tight">
                        {p.name}
                      </span>
                      {(p.nameKm || p.nameZh) && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {p.nameZh || p.nameKm}
                        </span>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-1.5">
                        <span className="text-sm font-semibold text-primary">
                          {formatMoney(p.price)}
                        </span>
                        <Badge
                          variant={
                            outOfStock
                              ? "destructive"
                              : p.stock <= p.lowStockAt
                              ? "warning"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {outOfStock ? t("store.outOfStock") : p.stock}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!products.length && (
                <p className="col-span-full py-16 text-center text-muted-foreground">
                  {t("common.noResults")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Cart panel ── */}
      <div className="flex w-80 flex-shrink-0 flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              {t("store.cart")}
              {cartCount > 0 && (
                <Badge className="ml-auto">{cartCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>

          {/* Item list */}
          <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-0 pt-0">
            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 opacity-25" />
                <span>{t("store.cartEmpty")}</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-2 rounded-md border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(item.product.price)} ×{" "}
                      {item.quantity} ={" "}
                      <span className="font-medium text-foreground">
                        {formatMoney(Number(item.product.price) * item.quantity)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQty(item.product.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-xs font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateQty(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          {/* Totals + checkout */}
          {cart.length > 0 && (
            <CardFooter className="flex flex-col gap-3 border-t p-3">
              {/* Customer */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-muted-foreground">Customer</span>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Store */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-muted-foreground">Store</span>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("invoices.currency")}</span>
                <Select
                  value={currency}
                  onValueChange={(v) => setCurrency(v as "USD" | "KHR")}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD $</SelectItem>
                    <SelectItem value="KHR">KHR ៛</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("invoices.discount")}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-7 w-24 text-right text-xs"
                />
              </div>

              {/* Tax */}
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("invoices.tax")}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="h-7 w-24 text-right text-xs"
                />
              </div>

              {/* Summary */}
              <div className="w-full space-y-1 border-t pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("invoices.subtotal")}</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>− {t("invoices.discount")}</span>
                    <span className="text-destructive">−{formatMoney(discount)}</span>
                  </div>
                )}
                {Number(tax) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>+ {t("invoices.tax")}</span>
                    <span>{formatMoney(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span>{t("invoices.grandTotal")}</span>
                  <span className="text-primary">{formatMoney(grandTotal, currency)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => checkout.mutate()}
                disabled={checkout.isPending}
              >
                {checkout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                {t("store.checkout")}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
