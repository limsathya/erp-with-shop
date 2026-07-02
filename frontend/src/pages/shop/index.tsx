import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, ImageIcon, ShoppingCart, Plus, Check, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi } from "@/lib/shop-api";
import { useCart } from "@/context/cart-context";
import { formatMoney } from "@/lib/utils";
import type { Product, Category } from "@/types";

export default function ShopHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(searchParams.get("categoryId"));
  const { addItem, items: cartItems } = useCart();

  useEffect(() => {
    const cat = searchParams.get("categoryId");
    setCategoryId(cat);
  }, [searchParams]);

  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products", search, categoryId],
    queryFn: async () =>
      (await shopApi.get("/products", { params: { search, categoryId, pageSize: 48 } })).data,
  });

  const { data: categoryData } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => (await shopApi.get("/categories")).data,
  });

  const products: Product[] = productData?.items ?? [];
  const categories: Category[] = categoryData?.items ?? [];

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 px-6 py-12 text-primary-foreground sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-xl space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to ERP Store
          </h1>
          <p className="text-primary-foreground/90 sm:text-lg">
            Browse our curated collection of premium coffee and equipment. Order online and pick up in store or arrange delivery.
          </p>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="mt-2 gap-2"
          >
            <Link to="/shop/cart">
              Go to cart
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + categories */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={categoryId === null ? "default" : "outline"}
              onClick={() => {
                setCategoryId(null);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete("categoryId");
                  return next;
                });
              }}
            >
              All
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={categoryId === c.id ? "default" : "outline"}
                onClick={() => {
                  setCategoryId(c.id);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("categoryId", c.id);
                    return next;
                  });
                }}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      {productsLoading ? (
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
              <Link
                key={p.id}
                to={`/shop/products/${p.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square bg-muted">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
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
                      onClick={(e) => handleAdd(e, p)}
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
