"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

function OrderSuccessContent() {
  const params = useSearchParams();
  const number = params.get("number") || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <CardTitle>Order Placed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Your order <strong>{number}</strong> has been placed successfully.</p>
          <div className="flex gap-2 justify-center">
            <Link href="/shop/orders"><Button variant="outline">View Orders</Button></Link>
            <Link href="/"><Button>Continue Shopping</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
