import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft } from "lucide-react";

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
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPhone: string | null;
  createdAt: string;
  updatedAt: string;
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

const STEPS = [
  { key: "new", label: "Order Placed", timestampField: "createdAt" as const },
  { key: "paid", label: "Confirmed", timestampField: "paidAt" as const },
  { key: "processing", label: "Processing", timestampField: "processingAt" as const },
  { key: "packed", label: "Packed", timestampField: "packedAt" as const },
  { key: "shipped", label: "Shipped", timestampField: "shippedAt" as const },
  { key: "out_for_delivery", label: "Out for Delivery", timestampField: "outForDeliveryAt" as const },
  { key: "delivered", label: "Delivered", timestampField: "deliveredAt" as const },
];

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

function StatusBadge({ status }: { status: string }) {
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";
  return (
    <span className={`velora-label px-3 py-1.5 border ${isDelivered ? 'border-primary text-primary' : isCancelled ? 'border-destructive text-destructive' : 'border-border text-foreground'}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentStatusBadge({ order }: { order: Order }) {
  const ps = order.paymentStatus;
  const label = ps === "cod" ? (order.status === "delivered" ? "COD Paid" : "Pay on Delivery") :
                ps === "paid" ? "Paid" :
                ps === "failed" ? "Payment Failed" : "Payment Pending";
  return <span className="velora-label px-3 py-1.5 border border-border text-muted-foreground">{label}</span>;
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  useSEO({ title: `Track Order #${id}`, description: "View your order details and tracking status." });
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
    refetchInterval: 60_000,
  });

  if (!user) return null;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">Loading Order...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <h1 className="font-serif text-4xl">Order Not Found</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">This order doesn't exist or access is denied.</p>
          <Link href="/dashboard/customer" className="velora-link uppercase text-xs tracking-widest inline-block mt-4">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const estDelivery = isCancelled || order.status === "delivered" ? null : format(addDays(order.shippedAt ? new Date(order.shippedAt) : new Date(order.createdAt), order.shippedAt ? 3 : 7), "EEEE, MMMM d");

  return (
    <div className="bg-background min-h-screen pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-16">
          <Link href="/dashboard/customer" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to Orders
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold mb-4">Order #{order.id}</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              Placed on {format(new Date(order.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <PaymentStatusBadge order={order} />
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Main Content - Timeline */}
          <div className="lg:col-span-7">
            <h2 className="font-serif text-2xl font-bold mb-10">Tracking History</h2>
            
            {isCancelled ? (
              <div className="border border-border p-8 text-center space-y-2">
                <p className="font-serif text-xl text-destructive">Order Cancelled</p>
                <p className="text-sm text-muted-foreground tracking-wide">This order has been cancelled. Contact support for details.</p>
              </div>
            ) : (
              <div className="relative pl-4">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border -translate-x-1/2" />
                <div className="space-y-12">
                  {STEPS.map((step) => {
                    const state = stepState(step.key, order.status);
                    const ts = step.timestampField ? order[step.timestampField] : null;

                    return (
                      <div key={step.key} className={`relative flex items-start gap-8 ${state === "pending" ? "opacity-40" : "opacity-100"} transition-opacity`}>
                        <div className="absolute left-0 -translate-x-1/2 mt-1.5 w-2 h-2 bg-background border border-foreground rounded-full flex items-center justify-center z-10">
                           {state === "done" && <div className="w-1 h-1 bg-foreground rounded-full" />}
                           {state === "active" && <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-serif text-xl mb-1 ${state === "active" ? "text-primary" : "text-foreground"}`}>{step.label}</p>
                          {ts ? (
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">
                              {format(new Date(ts), "MMM d, yyyy · h:mm a")}
                            </p>
                          ) : state === "active" ? (
                            <p className="text-xs text-primary uppercase tracking-widest">
                              In Progress
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {estDelivery && (
              <div className="mt-16 p-8 bg-muted/30 border border-border">
                <p className="velora-label text-muted-foreground mb-2">ESTIMATED DELIVERY</p>
                <p className="font-serif text-xl">{estDelivery}</p>
              </div>
            )}
          </div>

          {/* Sidebar - Details */}
          <div className="lg:col-span-5 space-y-12">
            <div>
              <h3 className="velora-label text-muted-foreground border-b border-border pb-4 mb-6">SHIPPING DETAILS</h3>
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="font-medium">{order.shippingName}</p>
                <p className="text-muted-foreground">{order.shippingAddress}</p>
                <p className="text-muted-foreground">{order.shippingCity}</p>
                <p className="text-muted-foreground">{order.shippingPhone}</p>
              </div>
              {order.trackingNote && (
                <div className="mt-6 p-4 border border-border bg-muted/10 text-sm">
                  <p className="font-medium mb-1">Tracking Note:</p>
                  <p className="text-muted-foreground">{order.trackingNote}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="velora-label text-muted-foreground border-b border-border pb-4 mb-6">ORDER ITEMS</h3>
              <div className="space-y-6">
                {order.items.map((item) => (
                  <div key={item.productVariantId} className="flex gap-4">
                    {item.imageUrl ? (
                      <div className="w-16 h-20 bg-muted shrink-0">
                        <img src={item.imageUrl} alt={item.nameEn} className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="w-16 h-20 bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate mb-1">{item.nameEn}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs text-muted-foreground">QTY {item.quantity}</span>
                        <span className="text-sm">{(item.price * item.quantity).toLocaleString()} EGP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="velora-label text-muted-foreground border-b border-border pb-4 mb-6">SUMMARY</h3>
              <div className="space-y-3 text-sm">
                {order.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                    <span>−{Number(order.discount).toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-4 border-t border-border">
                  <span>Total</span>
                  <span>{Number(order.totalPrice).toLocaleString()} EGP</span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border text-center">
              <Link href={`/dashboard/customer?tab=support`} className="velora-link text-[10px] uppercase tracking-widest text-muted-foreground">
                Need Help? Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
