import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ImageIcon, ShoppingCart, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi } from "@/lib/shop-api";
import { useCart } from "@/context/cart-context";
import { formatMoney } from "@/lib/utils";

interface ShopProduct {
  id: string;
  name: string;
  nameKm?: string;
  nameZh?: string;
  price: string;
  stock: number;
  lowStockAt: number;
  imageUrl?: string | null;
  category?: { name: string } | null;
}

export default function ShopHomePage() {
  const [search, setSearch] = useState("");
  const { addItem, items: cartItems } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["shop-products", search],
    queryFn: async () =>
      (await shopApi.get("/products", { params: { search, pageSize: 48 } })).data,
  });

  const products: ShopProduct[] = data?.items ?? [];

  const handleAdd = (p: ShopProduct) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl,
    });
    toast.success(`${p.name} added to cart`);
  };

  const inCart = (id: string) => cartItems.find((i) => i.productId === id);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Our Products</h1>
        <p className="text-muted-foreground">Browse our full collection and order online.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const cartEntry = inCart(p.id);
            const lowStock = p.stock <= p.lowStockAt && p.stock > 0;

            return (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                {/* Image */}
                <div className="relative aspect-square bg-muted">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/25" />
                    </div>
                  )}
                  {cartEntry && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow">
                      {cartEntry.quantity}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {p.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.category.name}
                    </span>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">
                    {p.name}
                  </p>
                  {(p.nameKm || p.nameZh) && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.nameZh || p.nameKm}
                    </p>
                  )}

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-primary">
                        {formatMoney(p.price)}
                      </span>
                      {lowStock && (
                        <Badge variant="warning" className="text-[10px]">
                          Only {p.stock} left
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={cartEntry ? "secondary" : "default"}
                      className="w-full gap-1.5"
                      onClick={() => handleAdd(p)}
                    >
                      {cartEntry ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          In cart ({cartEntry.quantity})
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Add to cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
