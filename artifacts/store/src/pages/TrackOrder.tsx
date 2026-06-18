import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

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
    <span className={`velora-label px-3 py-1.5 border ${isDelivered ? 'border-accent text-accent' : isCancelled ? 'border-primary text-primary' : 'border-border text-foreground'}`}>
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
  const { t } = useTranslation();
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
    <div className="space-y-24">
      {/* Header */}
      <div className="text-center space-y-8">
        <p className="velora-label">ORDER DETAILS</p>
        <h1 className="velora-heading text-5xl md:text-7xl">Order #{order.id}</h1>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
          {format(new Date(order.createdAt), "MMMM d, yyyy")}
        </p>
        <div className="flex items-center justify-center gap-4">
          <StatusBadge status={order.status} />
          <PaymentBadge order={order} />
        </div>
      </div>

      {/* Cancelled state */}
      {isCancelled ? (
        <div className="border border-border p-16 text-center space-y-6 max-w-2xl mx-auto">
          <p className="velora-heading text-3xl text-primary">{t("track.cancelled")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("track.cancelledDesc")}</p>
        </div>
      ) : (
        /* Timeline */
        <div className="max-w-xl mx-auto">
          <div className="relative pl-12 md:pl-0">
            <div className="absolute left-12 md:left-[50%] top-2 bottom-2 w-px bg-border md:-translate-x-1/2" />
            <div className="space-y-16">
              {STEPS.map((step) => {
                const state = stepState(step.key, order.status);
                const ts = step.tsField ? order[step.tsField] : null;

                return (
                  <div key={step.key} className={`relative flex items-center md:justify-between ${state === "pending" ? "opacity-30" : "opacity-100"} transition-all duration-500`}>
                    
                    {/* Left text (desktop only) */}
                    <div className="hidden md:block w-[42%] text-right">
                       <p className={`velora-heading text-2xl transition-colors duration-500 ${state === "active" ? "text-accent" : "text-foreground"}`}>{step.label}</p>
                    </div>

                    {/* Dot */}
                    <div className={`absolute left-0 md:left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border z-10 transition-colors duration-500 ${state === "done" ? "bg-foreground border-foreground" : state === "active" ? "bg-accent border-accent animate-pulse" : "bg-background border-border"}`} />

                    {/* Right text */}
                    <div className="w-full pl-12 md:pl-0 md:w-[42%] text-left">
                      <p className={`velora-heading text-2xl md:hidden mb-2 transition-colors duration-500 ${state === "active" ? "text-accent" : "text-foreground"}`}>{step.label}</p>
                      {ts ? (
                        <p className="velora-label text-muted-foreground">
                          {format(new Date(ts), "MMM d · h:mm a")}
                        </p>
                      ) : state === "active" ? (
                        <p className="velora-label text-accent">
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
      <div className="flex justify-center pt-12 border-t border-border">
        <Link href="/dashboard/customer" className="velora-link">
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
    <div className="text-center max-w-lg mx-auto space-y-12 py-12">
      <div className="space-y-6">
        <p className="velora-label text-accent">GUEST SERVICES</p>
        <h2 className="velora-heading text-5xl md:text-6xl">{t("track.title")}</h2>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest leading-loose max-w-xs mx-auto">{t("track.subtitle")}</p>
      </div>
      <div className="flex flex-col gap-8">
        <input
          type="number"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder={t("track.placeholder")}
          className="w-full border-b border-border bg-transparent px-0 py-6 text-center text-2xl velora-heading focus:outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 placeholder:font-sans placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest"
        />
        <button
          onClick={() => orderId && setLocation(`/track-order/${orderId}`)}
          disabled={!orderId}
          className="velora-btn-primary w-full h-16"
        >
          {t("track.title")}
        </button>
      </div>
      <div className="pt-12 border-t border-border">
        <Link href="/login" className="velora-link">
          {t("track.signIn")}
        </Link>
      </div>
    </div>
  );
}

export default function TrackOrder() {
  const { t } = useTranslation();
  useSEO({ title: t("track.title"), description: "Track your Velora order status." });
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
        {!token && <GuestSearch />}

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
