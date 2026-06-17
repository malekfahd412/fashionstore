import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import {
  CheckCircle2, Circle, Clock, Package, CreditCard, BoxIcon,
  Truck, MapPin, Home, ArrowLeft, ShoppingBag, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

type OrderItem = {
  productVariantId: number;
  nameEn: string;
  nameAr?: string | null;
  quantity: number;
  price: number;
  imageUrl: string | null;
  color: string | null;
  size: string | null;
};

type Order = {
  id: number;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  couponCode: string | null;
  discount: number;
  createdAt: string;
  paidAt: string | null;
  processingAt: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  trackingNote: string | null;
  paymentStatus: string | null;
  items: OrderItem[];
};

const STATUS_ORDER = ["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

function stepState(stepKey: string, currentStatus: string): "done" | "active" | "pending" {
  if (currentStatus === "cancelled") return "pending";
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx === -1) return "pending";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function getProgress(status: string): number {
  if (status === "cancelled") return 0;
  const idx = STATUS_ORDER.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    processing: "bg-yellow-50 text-yellow-700 border-yellow-200",
    packed: "bg-teal-50 text-teal-700 border-teal-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    out_for_delivery: "bg-orange-50 text-orange-700 border-orange-200",
    delivered: "bg-[#C9A227]/8 text-[#9a7a1a] border-[#C9A227]/20",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide border rounded-full ${styles[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentBadge({ order }: { order: Order }) {
  const { t } = useTranslation();
  const ps = order.paymentStatus;
  if (ps === "cod") {
    return order.status === "delivered"
      ? <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{t("track.codPaid")}</span>
      : <span className="text-xs font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">{t("track.payOnDelivery")}</span>;
  }
  if (ps === "paid") return <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{t("track.paid")}</span>;
  if (ps === "failed") return <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{t("track.paymentFailed")}</span>;
  return <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">{t("track.paymentPending")}</span>;
}

function OrderView({ order }: { order: Order }) {
  const { t, language } = useTranslation();
  const isCancelled = order.status === "cancelled";
  const progress = getProgress(order.status);
  const estDelivery = (() => {
    if (isCancelled || order.status === "delivered") return null;
    const base = order.shippedAt ? new Date(order.shippedAt) : new Date(order.createdAt);
    return format(addDays(base, order.shippedAt ? 3 : 7), "EEEE, MMMM d");
  })();

  const STEPS = [
    { key: "new", label: t("track.step.placed.label"), description: t("track.step.placed.desc"), icon: ShoppingBag, tsField: "createdAt" as const },
    { key: "paid", label: t("track.step.paid.label"), description: t("track.step.paid.desc"), icon: CreditCard, tsField: "paidAt" as const },
    { key: "processing", label: t("track.step.processing.label"), description: t("track.step.processing.desc"), icon: BoxIcon, tsField: "processingAt" as const },
    { key: "packed", label: t("track.step.packed.label"), description: t("track.step.packed.desc"), icon: Package, tsField: "packedAt" as const },
    { key: "shipped", label: t("track.step.shipped.label"), description: t("track.step.shipped.desc"), icon: Truck, tsField: "shippedAt" as const },
    { key: "out_for_delivery", label: t("track.step.outForDelivery.label"), description: t("track.step.outForDelivery.desc"), icon: MapPin, tsField: "outForDeliveryAt" as const },
    { key: "delivered", label: t("track.step.delivered.label"), description: t("track.step.delivered.desc"), icon: Home, tsField: "deliveredAt" as const },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-1">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">
            {t("track.placed")} {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          <PaymentBadge order={order} />
        </div>
      </div>

      {/* Estimated delivery */}
      {estDelivery && (
        <div className="flex items-center gap-3 border border-primary/20 bg-primary/5 px-5 py-3">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm"><span className="font-semibold">{t("track.estimatedDelivery")}</span> {estDelivery}</p>
        </div>
      )}

      {/* Tracking note */}
      {order.trackingNote && (
        <div className="flex items-start gap-3 border border-border bg-muted/30 px-5 py-3">
          <Truck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm"><span className="font-semibold">{t("track.trackingInfo")}</span> {order.trackingNote}</p>
        </div>
      )}

      {/* Animated progress bar */}
      {!isCancelled && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{t("track.orderPlaced")}</span>
            <span>{progress}{t("track.complete")}</span>
            <span>{t("track.delivered")}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.map((step, i) => {
              const state = stepState(step.key, order.status);
              return (
                <div
                  key={step.key}
                  className={`w-2 h-2 rounded-full transition-all ${
                    state === "done" ? "bg-primary" : state === "active" ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/30"
                  }`}
                  style={{ marginLeft: i === 0 ? 0 : undefined }}
                  title={step.label}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
          <p className="font-semibold text-destructive">{t("track.cancelled")}</p>
          <p className="text-sm text-muted-foreground">{t("track.cancelledDesc")}</p>
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border" />
          <ol className="space-y-0">
            {STEPS.map((step, idx) => {
              const state = stepState(step.key, order.status);
              const ts = step.tsField ? order[step.tsField] : null;
              const Icon = step.icon;
              const isLast = idx === STEPS.length - 1;

              return (
                <li key={step.key} className={`relative flex gap-4 ${isLast ? "" : "pb-8"}`}>
                  <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    state === "done"
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : state === "active"
                      ? "border-primary bg-background text-primary animate-pulse"
                      : "border-border bg-background text-muted-foreground"
                  }`}>
                    {state === "done" ? <CheckCircle2 className="w-5 h-5" /> : state === "active" ? <Icon className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-40" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                      <p className={`font-semibold text-sm ${state === "pending" ? "text-muted-foreground" : ""}`}>
                        {step.label}
                      </p>
                      {ts ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(ts), "MMM d, yyyy · h:mm a")}
                        </span>
                      ) : state === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Clock className="w-3 h-3" /> {t("track.inProgress")}
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-xs mt-0.5 leading-relaxed ${state === "pending" ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Order items */}
      <div className="border border-border">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("track.orderItems")}</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center gap-4 px-5 py-4">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.nameEn} className="w-14 h-14 object-cover bg-muted shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-muted shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {language === "ar" && item.nameAr ? item.nameAr : item.nameEn}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[item.color, item.size].filter(Boolean).join(" · ")} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">
                {(item.price * item.quantity).toLocaleString()} EGP
              </p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>{t("track.discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span className="text-green-600">−{Number(order.discount).toLocaleString()} EGP</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>{t("track.total")}</span>
            <span>{Number(order.totalPrice).toLocaleString()} EGP</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{order.paymentMethod.replace(/_/g, " ")}</span>
            <PaymentBadge order={order} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/customer">{t("track.backToOrders")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/products">{t("track.continueShop")}</Link>
        </Button>
      </div>
    </div>
  );
}

function GuestSearch() {
  const { t } = useTranslation();
  const [orderId, setOrderId] = useState("");
  const [, setLocation] = useLocation();

  return (
    <div className="text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Package className="w-8 h-8 text-primary" />
      </div>
      <h2 className="font-serif text-2xl font-bold mb-2">{t("track.title")}</h2>
      <p className="text-muted-foreground mb-8 text-sm">{t("track.subtitle")}</p>
      <div className="flex gap-2">
        <input
          type="number"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder={t("track.placeholder")}
          className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button
          onClick={() => orderId && setLocation(`/track-order/${orderId}`)}
          disabled={!orderId}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
      <div className="mt-6 flex gap-3 justify-center">
        <Button variant="outline" asChild>
          <Link href="/login">{t("track.signIn")}</Link>
        </Button>
        <Button asChild>
          <Link href="/products">{t("track.shopNow")}</Link>
        </Button>
      </div>
    </div>
  );
}

export default function TrackOrder() {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const token = localStorage.getItem("auth_token");

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order-track", orderId],
    queryFn: () => apiFetch(`/api/orders/${orderId}`),
    enabled: !!orderId && !!token,
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {orderId && (
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("track.backToDashboard")}
        </Link>
      )}

      {!token && !orderId && <GuestSearch />}

      {token && isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="h-2 bg-muted rounded-full" />
          <div className="h-64 bg-muted rounded" />
        </div>
      )}

      {token && error && (
        <div className="text-center space-y-4 py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold font-serif">{t("track.notFound")}</h1>
          <p className="text-muted-foreground text-sm">{t("track.notFoundDesc")}</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/customer">{t("track.backToOrders")}</Link>
          </Button>
        </div>
      )}

      {order && <OrderView order={order} />}
    </div>
  );
}
