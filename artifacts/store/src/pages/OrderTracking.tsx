import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock, Package, CreditCard, Settings, Truck, Home, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  productId: number;
  productVariantId: number;
  nameEn: string;
  nameAr: string | null;
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
  updatedAt: string;
  paidAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
};

type Step = {
  key: string;
  label: string;
  description: string;
  icon: typeof Package;
  timestampField: keyof Pick<Order, "createdAt" | "paidAt" | "processingAt" | "shippedAt" | "deliveredAt"> | null;
};

const STEPS: Step[] = [
  {
    key: "new",
    label: "Order Placed",
    description: "Your order has been received and is awaiting payment confirmation.",
    icon: ShoppingBag,
    timestampField: "createdAt",
  },
  {
    key: "paid",
    label: "Payment Confirmed",
    description: "Payment received. Your order is being prepared for processing.",
    icon: CreditCard,
    timestampField: "paidAt",
  },
  {
    key: "processing",
    label: "Processing",
    description: "Your items are being picked, packed, and quality-checked.",
    icon: Settings,
    timestampField: "processingAt",
  },
  {
    key: "shipped",
    label: "Shipped",
    description: "Your order is on its way. Check your email for tracking details.",
    icon: Truck,
    timestampField: "shippedAt",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Your order has arrived. Enjoy your purchase!",
    icon: Home,
    timestampField: "deliveredAt",
  },
];

const STATUS_ORDER = ["new", "paid", "processing", "shipped", "delivered"];

function stepState(stepKey: string, currentStatus: string): "done" | "active" | "pending" {
  if (currentStatus === "cancelled") return "pending";
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx === -1) return "pending";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    processing: "bg-yellow-50 text-yellow-700 border-yellow-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wide border rounded-full ${styles[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) setLocation(`/login?from=/order/${id}/tracking`);
  }, [user, id, setLocation]);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: () => apiFetch(`/api/orders/${id}`),
    enabled: !!user && !!id,
    staleTime: 30_000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-4">
        <Package className="w-12 h-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold font-serif">Order not found</h1>
        <p className="text-muted-foreground">This order doesn't exist or you don't have permission to view it.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/customer">← Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/* Back nav */}
      <Link href="/dashboard/customer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to My Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-serif">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Placed on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {isCancelled ? (
        <div className="border border-destructive/30 bg-destructive/5 p-6 rounded text-center space-y-2 mb-8">
          <p className="font-semibold text-destructive">Order Cancelled</p>
          <p className="text-sm text-muted-foreground">This order has been cancelled. If you have questions, please contact support.</p>
        </div>
      ) : (
        <div className="relative mb-10">
          {/* Vertical connector line */}
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border" aria-hidden="true" />

          <ol className="space-y-0">
            {STEPS.map((step, idx) => {
              const state = stepState(step.key, order.status);
              const ts = step.timestampField ? order[step.timestampField] : null;
              const Icon = step.icon;
              const isLast = idx === STEPS.length - 1;

              return (
                <li key={step.key} className={`relative flex gap-4 ${isLast ? "" : "pb-8"}`}>
                  {/* Icon node */}
                  <div
                    className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      state === "done"
                        ? "border-primary bg-primary text-primary-foreground"
                        : state === "active"
                        ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {state === "done" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : state === "active" ? (
                      <Icon className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4 opacity-40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                      <p className={`font-semibold text-sm ${state === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                        {step.label}
                      </p>
                      {ts ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(ts), "MMM d, yyyy · h:mm a")}
                        </span>
                      ) : state === "active" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Clock className="w-3 h-3" /> In progress
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-xs mt-0.5 leading-relaxed ${state === "pending" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Order summary */}
      <div className="border border-border">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Order Summary</h2>
        </div>

        {/* Items */}
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center gap-4 px-5 py-4">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.nameEn} className="w-14 h-14 object-cover bg-muted flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-muted flex-shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nameEn}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[item.color, item.size].filter(Boolean).join(" · ")}
                  {" "}× {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-border bg-muted/20 space-y-2 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span className="text-green-600">−${Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>Total</span>
            <span>${Number(order.totalPrice).toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            Paid via {order.paymentMethod.replace(/_/g, " ")}
          </p>
        </div>
      </div>
    </div>
  );
}
