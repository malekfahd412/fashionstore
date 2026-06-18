import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
    <span className={`velora-label px-3 py-1.5 border ${isDelivered ? 'border-accent text-accent' : isCancelled ? 'border-primary text-primary' : 'border-border text-foreground'}`}>
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
  const { t } = useLanguage();
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
    return <div className="min-h-screen flex items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">Loading Order...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <h1 className="velora-heading text-4xl md:text-5xl">Order Not Found</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">This order doesn't exist or access is denied.</p>
          <div className="pt-8">
            <Link href="/dashboard/customer" className="velora-link">Return to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const estDelivery = isCancelled || order.status === "delivered" ? null : format(addDays(order.shippedAt ? new Date(order.shippedAt) : new Date(order.createdAt), order.shippedAt ? 3 : 7), "EEEE, MMMM d");

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-16">
          <Link href="/dashboard/customer" className="inline-flex items-center gap-2 velora-link group">
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
            Back to Orders
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 border-b border-border pb-12">
          <div>
            <p className="velora-label mb-4">ORDER HISTORY</p>
            <h1 className="velora-heading text-5xl md:text-7xl mb-4">Order #{order.id}</h1>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
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
            <h2 className="velora-heading text-3xl mb-12">Tracking Journey</h2>
            
            {isCancelled ? (
              <div className="border border-border p-12 text-center space-y-4">
                <p className="velora-heading text-2xl text-primary">Order Cancelled</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">This order has been cancelled and is no longer being processed. For any questions, please contact our concierge.</p>
              </div>
            ) : (
              <div className="relative pl-8">
                <div className="absolute left-[3.5px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-16">
                  {STEPS.map((step) => {
                    const state = stepState(step.key, order.status);
                    const ts = step.timestampField ? order[step.timestampField] : null;

                    return (
                      <div key={step.key} className={`relative flex items-start gap-12 ${state === "pending" ? "opacity-30" : "opacity-100"} transition-all duration-500`}>
                        <div className={`absolute left-[-32px] mt-1.5 w-2 h-2 rounded-full border z-10 transition-colors duration-500 ${state === "done" ? "bg-foreground border-foreground" : state === "active" ? "bg-accent border-accent animate-pulse" : "bg-background border-border"}`} />
                        <div className="flex-1">
                          <p className={`velora-heading text-2xl mb-2 transition-colors duration-500 ${state === "active" ? "text-accent" : "text-foreground"}`}>{step.label}</p>
                          {ts ? (
                            <p className="velora-label text-muted-foreground">
                              {format(new Date(ts), "MMM d, yyyy · h:mm a")}
                            </p>
                          ) : state === "active" ? (
                            <p className="velora-label text-accent">
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
              <div className="mt-20 p-12 bg-white border border-border">
                <p className="velora-label text-accent mb-4">ESTIMATED ARRIVAL</p>
                <p className="velora-heading text-3xl">{estDelivery}</p>
              </div>
            )}
          </div>

          {/* Sidebar - Details */}
          <div className="lg:col-span-5 space-y-16 lg:pl-12 lg:border-l border-border">
            <div>
              <h3 className="velora-label mb-8">SHIPPING INFORMATION</h3>
              <div className="space-y-2 text-sm leading-relaxed font-light">
                <p className="font-semibold text-foreground">{order.shippingName}</p>
                <p className="text-muted-foreground">{order.shippingAddress}</p>
                <p className="text-muted-foreground">{order.shippingCity}</p>
                <p className="text-muted-foreground">{order.shippingPhone}</p>
              </div>
              {order.trackingNote && (
                <div className="mt-8 p-6 border border-border bg-white italic text-[13px] text-muted-foreground leading-relaxed">
                  <span className="velora-label block mb-2 not-italic">Concierge Note:</span>
                  "{order.trackingNote}"
                </div>
              )}
            </div>

            <div>
              <h3 className="velora-label mb-8">CURATED SELECTION</h3>
              <div className="space-y-8">
                {order.items.map((item) => (
                  <div key={item.productVariantId} className="flex gap-6 group">
                    <div className="w-20 h-24 bg-white shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.nameEn} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="velora-heading text-lg truncate mb-1">{item.nameEn}</p>
                      <p className="velora-label text-muted-foreground mb-4">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="velora-label text-muted-foreground">QTY {item.quantity}</span>
                        <span className="velora-label text-accent">{(item.price * item.quantity).toLocaleString()} EGP</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="velora-label mb-8">TOTAL INVESTMENT</h3>
              <div className="space-y-4">
                {order.discount > 0 && (
                  <div className="flex justify-between velora-label text-muted-foreground">
                    <span>Privilege Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                    <span>−{Number(order.discount).toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between pt-6 border-t border-border">
                  <span className="velora-label text-foreground">Final Total</span>
                  <span className="velora-heading text-2xl text-accent">{Number(order.totalPrice).toLocaleString()} EGP</span>
                </div>
              </div>
            </div>

            <div className="pt-12 border-t border-border">
              <Link href={`/dashboard/customer?tab=support`} className="velora-link block text-center">
                Inquiry with Concierge
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
