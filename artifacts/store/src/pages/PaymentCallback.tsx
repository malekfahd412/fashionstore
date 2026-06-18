import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { CheckCircle2, XCircle, Clock, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PaymentCallback() {
  const { t } = useLanguage();
  useSEO({ title: "Payment Status", description: "Verifying your payment." });
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);

    const success = params.get("success");
    const pendingParam = params.get("pending");
    const orderIdParam = params.get("merchant_order_id") ?? params.get("order_id");

    if (orderIdParam) {
      const parsed = parseInt(orderIdParam, 10);
      if (!isNaN(parsed)) setOrderId(parsed);
    }

    if (success === "true") {
      setStatus("success");
    } else if (pendingParam === "true") {
      setStatus("pending");
    } else {
      setStatus("failed");
    }
  }, [search]);

  const handleTrackOrder = () => {
    if (orderId) {
      setLocation(`/order/${orderId}/tracking`);
    } else {
      setLocation("/dashboard/customer");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="h-16 w-16 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-lg text-muted-foreground">Processing your payment…</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-serif">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your payment has been confirmed. We're now processing your order.
            </p>
            {orderId && (
              <p className="text-sm font-medium">Order #{orderId}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleTrackOrder} className="gap-2">
              Track Order <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
              <Home className="h-4 w-4" /> Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <Clock className="h-20 w-20 mx-auto text-yellow-500" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-serif">Payment Pending</h1>
            <p className="text-muted-foreground">
              Your payment is being processed. You'll receive a confirmation once it's complete.
            </p>
            {orderId && (
              <p className="text-sm font-medium">Order #{orderId}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleTrackOrder} className="gap-2">
              Track Order <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
              <Home className="h-4 w-4" /> Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle className="h-20 w-20 mx-auto text-destructive" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-serif">Payment Failed</h1>
          <p className="text-muted-foreground">
            We couldn't process your payment. Your order has been saved — you can retry the payment from your order history.
          </p>
          {orderId && (
            <p className="text-sm font-medium">Order #{orderId}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => setLocation("/dashboard/customer")} className="gap-2">
            My Orders <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
            <Home className="h-4 w-4" /> Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
