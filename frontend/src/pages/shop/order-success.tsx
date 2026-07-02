import { Link, useLocation } from "react-router-dom";
import { CheckCircle, ShoppingBag, Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

interface OrderSuccessState {
  id?: string;
  number?: string;
  total?: number;
}

export default function ShopOrderSuccessPage() {
  const location = useLocation();
  const state = (location.state as OrderSuccessState) || {};
  const { id, number, total } = state;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Order placed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. You can pay now with KHQR or check your order details later.
        </p>
      </div>

      {number && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order number</span>
              <span className="font-mono font-semibold">{number}</span>
            </div>
            {total !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatMoney(total)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {id && (
          <Button asChild>
            <Link to={`/shop/orders/${id}`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay now (KHQR)
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link to="/shop/orders">
            <Package className="mr-2 h-4 w-4" />
            My orders
          </Link>
        </Button>
        <Button variant="secondary" asChild className={id ? "sm:col-span-2" : ""}>
          <Link to="/shop">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
