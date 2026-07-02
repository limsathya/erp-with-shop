import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Minus, Plus, ShoppingCart, ImageIcon, Package, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { shopApi } from "@/lib/shop-api";
import { useCart } from "@/context/cart-context";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types";

export default function ShopProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();
  const [qty, setQty] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["shop-product", id],
    queryFn: async () => (await shopApi.get(`/products/${id}`)).data as Product,
    enabled: !!id,
  });

  const inCart = cartItems.find((i) => i.productId === id);
  const lowStock = product && product.stock <= product.lowStockAt && product.stock > 0;
  const outOfStock = product && product.stock <= 0;

  const handleAdd = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      quantity: qty,
    });
    toast.success(`${qty} × ${product.name} added to cart`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Package className="h-14 w-14 text-muted-foreground/25" />
        <p className="font-semibold">Product not found</p>
        <Button asChild>
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/shop">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to shop
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center">
              <ImageIcon className="h-20 w-20 text-muted-foreground/25" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          {product.category && (
            <Badge variant="secondary" className="text-xs">
              {product.category.name}
            </Badge>
          )}

          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            {(product.nameKm || product.nameZh) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.nameZh || product.nameKm}
              </p>
            )}
          </div>

          <p className="text-2xl font-bold text-primary">
            {formatMoney(product.price)}
          </p>

          {outOfStock ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : lowStock ? (
            <Badge variant="warning">Only {product.stock} left</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">In stock</p>
          )}

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQty((q) => q + 1)}
                disabled={outOfStock || (product && qty >= product.stock)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={handleAdd}
              disabled={outOfStock}
            >
              {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              {inCart ? `In cart (${inCart.quantity})` : "Add to cart"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate("/shop/cart")}
            >
              View cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
