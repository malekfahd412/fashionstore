import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ArrowLeft } from "lucide-react";
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

function StatusBadge({ status }: { status: string }) {
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";
  return (
    <span className={`velora-label px-3 py-1.5 border ${isDelivered ? 'border-primary text-primary' : isCancelled ? 'border-destructive text-destructive' : 'border-border text-foreground'}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentBadge({ order }: { order: Order }) {
  const { t } = useTranslation();
  const ps = order.paymentStatus;
  const label = ps === "cod" ? (order.status === "delivered" ? t("track.codPaid") : t("track.payOnDelivery")) :
                ps === "paid" ? t("track.paid") :
                ps === "failed" ? t("track.paymentFailed") : t("track.paymentPending");
  
  return <span className="velora-label px-3 py-1.5 border border-border text-muted-foreground">{label}</span>;
}

function OrderView({ order }: { order: Order }) {
  const { t, language } = useTranslation();
  const isCancelled = order.status === "cancelled";
  
  const STEPS = [
    { key: "new", label: t("track.step.placed.label"), tsField: "createdAt" as const },
    { key: "paid", label: t("track.step.paid.label"), tsField: "paidAt" as const },
    { key: "processing", label: t("track.step.processing.label"), tsField: "processingAt" as const },
    { key: "packed", label: t("track.step.packed.label"), tsField: "packedAt" as const },
    { key: "shipped", label: t("track.step.shipped.label"), tsField: "shippedAt" as const },
    { key: "out_for_delivery", label: t("track.step.outForDelivery.label"), tsField: "outForDeliveryAt" as const },
    { key: "delivered", label: t("track.step.delivered.label"), tsField: "deliveredAt" as const },
  ];

  return (
    <div className="space-y-16">
      {/* Header */}
      <div className="text-center space-y-6">
        <h1 className="font-serif text-4xl md:text-5xl font-bold">Order #{order.id}</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest">
          {format(new Date(order.createdAt), "MMMM d, yyyy")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <StatusBadge status={order.status} />
          <PaymentBadge order={order} />
        </div>
      </div>

      {/* Cancelled state */}
      {isCancelled ? (
        <div className="border border-border p-12 text-center space-y-4">
          <p className="font-serif text-2xl text-destructive">{t("track.cancelled")}</p>
          <p className="text-sm text-muted-foreground">{t("track.cancelledDesc")}</p>
        </div>
      ) : (
        /* Timeline */
        <div className="max-w-md mx-auto">
          <div className="relative pl-6 md:pl-0">
            <div className="absolute left-6 md:left-[50%] top-2 bottom-2 w-px bg-border md:-translate-x-1/2" />
            <div className="space-y-12">
              {STEPS.map((step, idx) => {
                const state = stepState(step.key, order.status);
                const ts = step.tsField ? order[step.tsField] : null;

                return (
                  <div key={step.key} className={`relative flex items-center md:justify-between ${state === "pending" ? "opacity-40" : "opacity-100"} transition-opacity`}>
                    
                    {/* Left text (desktop only) */}
                    <div className="hidden md:block w-[45%] text-right pr-8">
                       <p className={`font-serif text-xl ${state === "active" ? "text-primary" : "text-foreground"}`}>{step.label}</p>
                    </div>

                    {/* Dot */}
                    <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-3 h-3 bg-background border border-foreground rounded-full z-10 flex items-center justify-center">
                      {state === "done" && <div className="w-1.5 h-1.5 bg-foreground rounded-full" />}
                      {state === "active" && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />}
                    </div>

                    {/* Right text */}
                    <div className="w-full pl-8 md:pl-8 md:w-[45%]">
                      <p className={`font-serif text-xl md:hidden mb-1 ${state === "active" ? "text-primary" : "text-foreground"}`}>{step.label}</p>
                      {ts ? (
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {format(new Date(ts), "MMM d · h:mm a")}
                        </p>
                      ) : state === "active" ? (
                        <p className="text-xs text-primary uppercase tracking-wider">
                          {t("track.inProgress")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center pt-8 border-t border-border">
        <Link href="/dashboard/customer" className="velora-link uppercase tracking-widest text-xs">
          {t("track.backToOrders")}
        </Link>
      </div>
    </div>
  );
}

function GuestSearch() {
  const { t } = useTranslation();
  const [orderId, setOrderId] = useState("");
  const [, setLocation] = useLocation();

  return (
    <div className="text-center max-w-md mx-auto space-y-10">
      <div>
        <h2 className="font-serif text-4xl font-bold mb-4">{t("track.title")}</h2>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">{t("track.subtitle")}</p>
      </div>
      <div className="flex flex-col gap-4">
        <input
          type="number"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder={t("track.placeholder")}
          className="w-full border-b border-border bg-transparent px-0 py-4 text-center text-xl font-serif focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 placeholder:font-sans placeholder:text-sm placeholder:uppercase placeholder:tracking-widest"
        />
        <Button
          onClick={() => orderId && setLocation(`/track-order/${orderId}`)}
          disabled={!orderId}
          className="velora-btn-primary h-14"
        >
          {t("track.title")}
        </Button>
      </div>
      <div className="pt-8 border-t border-border">
        <Link href="/login" className="velora-link text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {t("track.signIn")}
        </Link>
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
    <div className="bg-background min-h-screen pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        {!token && !orderId && <GuestSearch />}

        {token && isLoading && (
          <div className="flex justify-center py-32 text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading Order...
          </div>
        )}

        {token && error && (
          <div className="text-center space-y-8 py-32">
            <h1 className="text-4xl font-serif">{t("track.notFound")}</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest">{t("track.notFoundDesc")}</p>
            <Link href="/dashboard/customer" className="velora-link text-xs uppercase tracking-widest inline-block">
              {t("track.backToOrders")}
            </Link>
          </div>
        )}

        {order && <OrderView order={order} />}
      </div>
    </div>
  );
}
