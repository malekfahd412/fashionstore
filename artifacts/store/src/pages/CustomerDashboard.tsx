import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import {
  useListOrders, useGetWishlist, useRemoveFromWishlist, useUpdateUser,
  useListNotifications, useMarkNotificationRead, useCreateOrder,
  getListOrdersQueryKey, getGetWishlistQueryKey, getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetMyReviews, useUpdateReview, useDeleteReview, getGetMyReviewsQueryKey, getAdminListReviewsQueryKey, getGetProductQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";
import { useSEO } from "@/hooks/useSEO";
import {
  MapPin, Plus, Pencil, Trash2, Star, Package, ShoppingBag,
  Heart, Bell, Shield, Settings, LayoutDashboard, RefreshCw,
  Clock, Check, PenLine, CheckCircle2, X, FileDown, Headphones, Send, MessageCircle, CreditCard, ChevronRight
} from "lucide-react";
import ProductCard from "@/components/ProductCard";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.body ? { "Content-Type": "application/json" } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

type UserAddress = {
  id: number; label: string; firstName: string; lastName: string;
  address: string; city: string; phone: string; isDefault: boolean;
};
type AddressFormData = Omit<UserAddress, "id" | "isDefault"> & { isDefault: boolean };
const EMPTY_ADDRESS: AddressFormData = { label: "Home", firstName: "", lastName: "", address: "", city: "Cairo", phone: "", isDefault: false };
const STATUS_STEPS = ["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

function PaymentStatusBadge({ paymentStatus, orderStatus }: { paymentStatus?: string | null; orderStatus: string }) {
  const { t } = useTranslation();
  if (paymentStatus === "cod") {
    return orderStatus === "delivered"
      ? <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#9a7a1a] bg-[#C9A227]/8 border border-[#C9A227]/25 px-2.5 py-1">{t("dash.codPaid")}</span>
      : <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-black/40 bg-black/4 border border-black/8 px-2.5 py-1">{t("dash.payOnDelivery")}</span>;
  }
  if (paymentStatus === "paid") return <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#9a7a1a] bg-[#C9A227]/8 border border-[#C9A227]/25 px-2.5 py-1">{t("dash.paid")}</span>;
  if (paymentStatus === "failed") return <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-red-600 bg-red-50 border border-red-200 px-2.5 py-1">{t("dash.paymentFailed")}</span>;
  return <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1">{t("dash.paymentPending")}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const isPositive = ["paid", "delivered"].includes(status);
  const isWarning = ["processing", "packed", "shipped", "out_for_delivery"].includes(status);
  const isNew = status === "new";
  const isCancelled = status === "cancelled";
  return (
    <span className={`px-2.5 py-1 text-[9px] font-bold tracking-[0.18em] uppercase border ${
      isPositive ? "bg-[#C9A227]/8 text-[#9a7a1a] border-[#C9A227]/25" :
      isWarning ? "bg-black/4 text-black/60 border-black/10" :
      isNew ? "bg-black/4 text-black/50 border-black/8" :
      isCancelled ? "bg-red-50 text-red-600 border-red-200" :
      "bg-black/4 text-black/40 border-black/8"
    }`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function AddressCard({ addr, onEdit, onDelete, onSetDefault, isLoading }: {
  addr: UserAddress; onEdit: () => void; onDelete: () => void; onSetDefault: () => void; isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`border p-6 relative ${addr.isDefault ? "border-[#111111]" : "border-black/10"}`}>
      {addr.isDefault && (
        <span className="absolute top-4 end-4 text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A227] flex items-center gap-1">
          <Star className="w-3 h-3 fill-[#C9A227]" /> {t("dash.addr.default")}
        </span>
      )}
      <div className="flex items-start gap-4 mb-5">
        <MapPin className="w-4 h-4 text-black/30 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="font-bold text-sm text-[#111111] mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{addr.label}</p>
          <p className="text-xs text-[#111111] font-medium">{addr.firstName} {addr.lastName}</p>
          <p className="text-xs text-black/45 mt-1 tracking-wide">{addr.address}, {addr.city}</p>
          <p className="text-xs text-black/45 tracking-wide">{addr.phone}</p>
        </div>
      </div>
      <div className="flex gap-4 pt-4 border-t border-black/6">
        {!addr.isDefault && (
          <button onClick={onSetDefault} disabled={isLoading} className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A227] hover:text-[#b8912a] transition-colors disabled:opacity-40">
            {t("dash.addr.setAsDefault")}
          </button>
        )}
        <div className="flex gap-4 ms-auto">
          <button onClick={onEdit} disabled={isLoading} className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-black/35 hover:text-[#111111] transition-colors disabled:opacity-40">
            <Pencil className="w-3 h-3" /> {t("dash.addr.edit")}
          </button>
          <button onClick={onDelete} disabled={isLoading} className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-red-400 hover:text-red-600 transition-colors disabled:opacity-40">
            <Trash2 className="w-3 h-3" /> {t("dash.addr.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressForm({ initial, onSave, onCancel, isSaving }: {
  initial: AddressFormData; onSave: (data: AddressFormData) => void; onCancel: () => void; isSaving: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AddressFormData>(initial);
  const set = (k: keyof AddressFormData, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const fieldClass = "h-11 border border-black/10 bg-white px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors w-full tracking-wide";
  const labelClass = "text-[9px] font-bold tracking-[0.25em] uppercase text-black/38 block mb-2";

  return (
    <div className="border border-black/10 p-8 bg-[#F7F6F4] space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="col-span-full">
          <label className={labelClass}>{t("dash.addr.label")}</label>
          <input className={fieldClass} value={form.label} onChange={e => set("label", e.target.value)} placeholder={t("dash.addr.labelPlaceholder")} />
        </div>
        <div>
          <label className={labelClass}>{t("dash.addr.firstName")}</label>
          <input className={fieldClass} value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" />
        </div>
        <div>
          <label className={labelClass}>{t("dash.addr.lastName")}</label>
          <input className={fieldClass} value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
        </div>
        <div className="col-span-full">
          <label className={labelClass}>{t("dash.addr.address")}</label>
          <input className={fieldClass} value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Fashion St" />
        </div>
        <div>
          <label className={labelClass}>{t("dash.addr.city")}</label>
          <input className={fieldClass} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cairo" />
        </div>
        <div>
          <label className={labelClass}>{t("dash.addr.phone")}</label>
          <input className={fieldClass} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+20 100 000 0000" />
        </div>
      </div>
      <label className="flex items-center gap-3 text-xs cursor-pointer font-medium text-[#111111]">
        <div className="relative flex items-center justify-center">
          <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="peer appearance-none w-4 h-4 border border-black/20 checked:bg-[#111111] checked:border-[#111111] transition-colors" />
          <Check className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </div>
        {t("dash.addr.setDefault")}
      </label>
      <div className="flex gap-3 pt-4 border-t border-black/8">
        <button
          className="flex-1 bg-[#111111] text-white py-3.5 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40"
          onClick={() => onSave(form)}
          disabled={isSaving || !form.firstName || !form.lastName || !form.address || !form.city || !form.phone}
        >
          {isSaving ? t("dash.addr.saving") : t("dash.addr.save")}
        </button>
        <button
          className="flex-1 border border-black/12 py-3.5 text-[9px] font-bold tracking-[0.25em] uppercase hover:border-black/40 transition-colors"
          onClick={onCancel}
          disabled={isSaving}
        >
          {t("dash.cancel")}
        </button>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  useSEO({ title: "My Account", description: "Manage your Velora orders, addresses, wishlist, and account settings." });

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabParam ?? "overview");
  const [supportOrderId, setSupportOrderId] = useState<number | null>(null);
  const [name, setName] = useState(user?.name || "");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const { data: ordersData } = useListOrders(
    { userId: user?.id },
    { query: { enabled: !!user, queryKey: getListOrdersQueryKey({ userId: user?.id }) } }
  );
  const { data: wishlist, refetch: refetchWishlist } = useGetWishlist(
    { query: { enabled: !!user, queryKey: getGetWishlistQueryKey() } }
  );
  const { data: notifications, refetch: refetchNotifications } = useListNotifications(
    { query: { enabled: !!user, queryKey: getListNotificationsQueryKey() } }
  );
  const { data: addresses, refetch: refetchAddresses } = useQuery<UserAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => apiFetch("/api/addresses"),
    enabled: !!user,
  });
  const { data: emailPrefs, refetch: refetchEmailPrefs } = useQuery<{
    emailPreferences: { orderUpdates: boolean; promotions: boolean; securityAlerts: boolean }
  }>({
    queryKey: ["email-preferences", user?.id],
    queryFn: () => apiFetch(`/api/users/${user!.id}`),
    enabled: !!user,
    select: (u) => ({
      emailPreferences: (u as { emailPreferences?: { orderUpdates: boolean; promotions: boolean; securityAlerts: boolean } })
        .emailPreferences ?? { orderUpdates: true, promotions: true, securityAlerts: true },
    }),
  });

  const prefs = emailPrefs?.emailPreferences ?? { orderUpdates: true, promotions: true, securityAlerts: true };

  type RecentProduct = { productId: number; nameEn: string | null; imageUrl: string | null; price: number | null; salePrice: number | null };
  const { data: recentlyViewed } = useQuery<RecentProduct[]>({
    queryKey: ["recently-viewed"],
    queryFn: () => apiFetch("/api/recently-viewed?limit=8"),
    enabled: !!user,
    staleTime: 60_000,
  });

  type SavedCoupon = { id: number; couponCode: string; savedAt: string; discountType: string | null; discountValue: string | null; endDate: string | null; active: boolean | null };
  const { data: savedCoupons, refetch: refetchSavedCoupons } = useQuery<SavedCoupon[]>({
    queryKey: ["saved-coupons"],
    queryFn: () => apiFetch("/api/saved-coupons"),
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: (data: AddressFormData) => apiFetch<UserAddress>("/api/addresses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); setShowAddressForm(false); toast({ title: t("dash.addr.saved") }); },
    onError: (e) => toast({ title: t("dash.addr.saveFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AddressFormData> }) =>
      apiFetch<UserAddress>(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); setEditingAddress(null); toast({ title: t("dash.addr.updated") }); },
    onError: (e) => toast({ title: t("dash.addr.updateFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); toast({ title: t("dash.addr.deleted") }); },
  });
  const updateEmailPrefsMutation = useMutation({
    mutationFn: (data: Partial<{ orderUpdates: boolean; promotions: boolean; securityAlerts: boolean }>) =>
      apiFetch(`/api/users/${user!.id}/email-preferences`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-preferences", user?.id] }); refetchEmailPrefs(); toast({ title: t("dash.emailPrefsSaved") }); },
  });
  const updateUserMutation = useUpdateUser();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const markReadMutation = useMarkNotificationRead();
  const createOrderMutation = useCreateOrder();

  useEffect(() => { if (!user) setLocation("/login?from=/dashboard/customer"); }, [user, setLocation]);
  if (!user) return null;

  const allOrders = ordersData?.orders ?? [];
  const activeOrders = allOrders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length;

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const matchesSearch = !orderSearch || String(o.id).includes(orderSearch);
      const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allOrders, orderSearch, orderStatusFilter]);

  const handleUpdateProfile = () => {
    if (!user) return;
    updateUserMutation.mutate({ id: user.id, data: { name } }, {
      onSuccess: (updatedUser) => {
        login(updatedUser, localStorage.getItem("auth_token") || "", localStorage.getItem("auth_refresh_token") || "");
        toast({ title: t("dash.profileUpdated") });
      }
    });
  };

  const handleRemoveWishlist = (productId: number) => {
    removeFromWishlistMutation.mutate({ productId }, {
      onSuccess: () => { toast({ title: t("dash.removedWishlist") }); qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() }); refetchWishlist(); },
    });
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }); refetchNotifications(); },
    });
  };

  const handleReorder = (order: { items?: Array<{ productVariantId: number; quantity: number; price: number }> }) => {
    if (!order.items?.length) return;
    createOrderMutation.mutate(
      { data: { items: order.items.map(i => ({ productVariantId: i.productVariantId, quantity: i.quantity })), paymentMethod: "cash_on_delivery" } },
      {
        onSuccess: (newOrder) => {
          toast({ title: t("dash.orderPlacedTitle"), description: (t("dash.orderPlacedDesc") || "Order {id} created").replace("{id}", String(newOrder.id)) });
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ userId: user.id }) });
          setLocation(`/track-order/${newOrder.id}`);
        },
        onError: (e) => toast({ title: t("dash.reorderFailed"), description: (e as Error).message, variant: "destructive" }),
      }
    );
  };

  const NAV_TABS = [
    { value: "overview", label: t("dash.tab.overview"), icon: LayoutDashboard },
    { value: "orders", label: t("dash.tab.orders"), icon: ShoppingBag },
    { value: "addresses", label: t("dash.tab.addresses"), icon: MapPin },
    { value: "wishlist", label: t("dash.tab.wishlist"), icon: Heart },
    { value: "my-reviews", label: t("dash.tab.myReviews"), icon: Star },
    { value: "support", label: t("dash.tab.support"), icon: MessageCircle },
    { value: "notifications", label: t("dash.tab.notifications"), icon: Bell, badge: unreadCount },
    { value: "payment-history", label: t("dash.tab.paymentHistory"), icon: CreditCard },
    { value: "security", label: t("dash.tab.security"), icon: Shield },
    { value: "profile", label: t("dash.tab.profile"), icon: Settings },
  ];

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="bg-[#F7F6F4] border-b border-black/6">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-12 md:py-16">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-4">Velora</p>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#111111] mb-3 leading-[0.92]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t("dash.myAccount")}
          </h1>
          <p className="text-black/40 text-sm tracking-wide">
            {t("dash.welcomeBack")} <span className="font-semibold text-[#111111]">{user.name}</span>
          </p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-16">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          {/* Mobile */}
          <div className="lg:hidden flex overflow-x-auto py-5 -mx-6 px-6 gap-2 no-scrollbar border-b border-black/6">
            {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap text-[9px] font-bold tracking-[0.18em] uppercase transition-colors shrink-0 ${
                  activeTab === value ? "bg-[#111111] text-white" : "bg-[#F7F6F4] text-black/45 hover:text-[#111111]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {badge ? <span className="bg-[#C9A227] text-white text-[9px] px-1.5 py-0.5 ms-1">{badge}</span> : null}
              </button>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block w-52 shrink-0 border-e border-black/6 py-12">
            <div className="space-y-0.5">
              {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`flex items-center gap-3.5 pe-6 py-3.5 w-full text-left text-[9px] font-bold tracking-[0.2em] uppercase transition-all border-e-2 ${
                    activeTab === value
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-black/35 hover:text-[#111111]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge ? (
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold ${activeTab === value ? "bg-[#C9A227] text-white" : "bg-[#C9A227]/80 text-white"}`}>{badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 py-10 lg:py-12">

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-12 animate-in fade-in duration-300">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t("dash.totalOrders"), value: allOrders.length, icon: ShoppingBag },
                    { label: t("dash.activeOrders"), value: activeOrders.length, icon: Clock },
                    { label: t("dash.wishlistItems"), value: wishlist?.length ?? 0, icon: Heart },
                    { label: "Notifications", value: unreadCount, icon: Bell },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="border border-black/8 p-6 bg-[#F7F6F4]">
                      <Icon className="w-4 h-4 text-black/30 mb-4" strokeWidth={1.5} />
                      <p className="text-3xl font-bold text-[#111111] mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{value}</p>
                      <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-black/35">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Active shipments */}
                {activeOrders.length > 0 && (
                  <div>
                    <h3 className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/35 mb-6 pb-3 border-b border-black/6">{t("dash.activeShipments")}</h3>
                    <div className="space-y-4">
                      {activeOrders.map(order => {
                        const stepIdx = STATUS_STEPS.indexOf(order.status);
                        const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                        return (
                          <div key={order.id} className="border border-black/8 p-6">
                            <div className="flex items-center justify-between mb-5">
                              <span className="font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Order #{order.id}</span>
                              <StatusBadge status={order.status} />
                            </div>
                            <div className="h-[1px] bg-black/6 relative mb-2">
                              <div className="absolute top-0 start-0 h-full bg-[#C9A227] transition-all duration-700" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold tracking-[0.15em] uppercase text-black/28">
                              <span>{t("dash.placed")}</span>
                              <span>{progress}%</span>
                              <span>{t("dash.deliveredLabel")}</span>
                            </div>
                            <button
                              className="mt-4 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/35 hover:text-black transition-colors border-b border-black/15 pb-0.5"
                              onClick={() => { setOrderSearch(String(order.id)); setActiveTab("orders"); }}
                            >
                              {t("dash.fullDetails")} <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent orders */}
                <div>
                  <div className="flex justify-between items-end mb-6 pb-3 border-b border-black/6">
                    <h3 className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/35">{t("dash.recentOrders")}</h3>
                    <button onClick={() => setActiveTab("orders")} className="text-[9px] font-bold tracking-[0.2em] uppercase text-black/35 hover:text-black transition-colors border-b border-black/15 pb-0.5">{t("dash.viewAll")}</button>
                  </div>
                  {!allOrders.length ? (
                    <div className="border border-dashed border-black/10 p-12 text-center">
                      <ShoppingBag className="w-8 h-8 text-black/15 mx-auto mb-4" strokeWidth={1} />
                      <p className="text-black/35 text-sm mb-6">{t("dash.noOrders")}</p>
                      <Link href="/products" className="inline-flex bg-[#111111] text-white px-8 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors">{t("dash.startShopping")}</Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allOrders.slice(0, 3).map(order => (
                        <div key={order.id} className="border border-black/8 px-6 py-5 flex items-center justify-between gap-6 hover:border-black/25 transition-colors">
                          <div>
                            <p className="font-bold text-[#111111] mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Order #{order.id}</p>
                            <p className="text-[9px] text-black/35 tracking-widest uppercase font-bold">
                              {format(new Date(order.createdAt), "MMM dd, yyyy")} · <span className="text-[#111111]">{Number(order.totalPrice).toLocaleString()} EGP</span>
                            </p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recently Viewed */}
                {(recentlyViewed ?? []).length > 0 && (
                  <div>
                    <h3 className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/35 mb-6 pb-3 border-b border-black/6">Recently Viewed</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {(recentlyViewed ?? []).slice(0, 4).map(item => (
                        <Link key={item.productId} href={`/products/${item.productId}`} className="group">
                          <div className="bg-[#F7F6F4] overflow-hidden mb-2" style={{ aspectRatio: "3/4" }}>
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-black/15" strokeWidth={1} /></div>
                            }
                          </div>
                          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-black/50 line-clamp-1">{item.nameEn}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS */}
            {activeTab === "orders" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-[#111111] pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.myOrders")}</h2>

                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-[#F7F6F4] border border-black/8">
                  <input
                    placeholder={t("dash.searchOrders") || "Search by order ID..."}
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="sm:max-w-[180px] h-10 border border-black/10 bg-white px-4 text-xs focus:outline-none focus:border-[#111111] transition-colors tracking-wide"
                  />
                  <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                    <SelectTrigger className="sm:w-48 h-10 border-black/10 bg-white text-[9px] font-bold tracking-[0.18em] uppercase focus:ring-0 focus:border-[#111111]">
                      <SelectValue placeholder={t("dash.filterByStatus") || "Filter"} />
                    </SelectTrigger>
                    <SelectContent className="border-black/10">
                      <SelectItem value="all" className="text-[9px] font-bold uppercase tracking-widest">{t("dash.allStatuses") || "All"}</SelectItem>
                      {["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"].map(s => (
                        <SelectItem key={s} value={s} className="text-[9px] font-bold uppercase tracking-widest">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!filteredOrders.length ? (
                  <div className="border border-dashed border-black/10 p-16 text-center">
                    <ShoppingBag className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
                    <p className="text-xl font-bold text-[#111111] mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {allOrders.length === 0 ? (t("dash.noOrdersYet") || "No orders yet.") : (t("dash.noOrdersMatch") || "No matching orders.")}
                    </p>
                    {allOrders.length === 0 && (
                      <Link href="/products" className="inline-flex bg-[#111111] text-white px-10 py-3.5 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#C9A227] transition-colors">{t("dash.startShopping")}</Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredOrders.map(order => (
                      <div key={order.id} className="border border-black/8 p-6 md:p-8 hover:border-black/25 transition-colors">
                        <div className="flex flex-col md:flex-row gap-5 md:items-start justify-between border-b border-black/6 pb-6 mb-6">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <span className="font-bold text-xl text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Order #{order.id}</span>
                              <StatusBadge status={order.status} />
                              <PaymentStatusBadge paymentStatus={(order as unknown as { paymentStatus?: string }).paymentStatus} orderStatus={order.status} />
                            </div>
                            <p className="text-[9px] text-black/35 tracking-[0.18em] uppercase font-bold">
                              {format(new Date(order.createdAt), "MMMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="md:text-end">
                            <p className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{Number(order.totalPrice).toLocaleString()} EGP</p>
                            <p className="text-[9px] text-black/35 tracking-[0.15em] uppercase font-bold mt-1">
                              {order.items?.length || 0} items · {order.paymentMethod.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
                          {(order.items as unknown as Array<{ productVariantId: number; imageUrl?: string | null }>).map((item, i) => (
                            <div key={i} className="w-16 shrink-0 bg-[#F7F6F4] border border-black/6 overflow-hidden" style={{ aspectRatio: "3/4" }}>
                              {item.imageUrl
                                ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-black/15" strokeWidth={1} /></div>
                              }
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-black/6">
                          <Link href={`/track-order/${order.id}`} className="flex items-center gap-1.5 bg-[#111111] text-white px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase hover:bg-[#C9A227] transition-colors">
                            Track <ChevronRight className="w-3 h-3" />
                          </Link>
                          <button
                            className="flex items-center gap-1.5 border border-black/10 px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/45 hover:border-black/40 hover:text-[#111111] transition-colors"
                            onClick={() => { setSupportOrderId(order.id); setActiveTab("support"); }}
                          >
                            <Headphones className="w-3 h-3" /> Support
                          </button>
                          <button
                            className="flex items-center gap-1.5 border border-black/10 px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/45 hover:border-black/40 hover:text-[#111111] transition-colors"
                            onClick={() => {
                              const token = localStorage.getItem("auth_token");
                              const a = document.createElement("a");
                              a.href = `${BASE}/api/orders/${order.id}/invoice`;
                              a.download = `invoice-${order.id}.pdf`;
                              const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
                              void fetch(a.href, { headers }).then(r => r.blob()).then(blob => {
                                const url = URL.createObjectURL(blob);
                                a.href = url; a.click(); URL.revokeObjectURL(url);
                              });
                            }}
                          >
                            <FileDown className="w-3 h-3" /> Invoice
                          </button>
                          {["delivered", "cancelled"].includes(order.status) && (
                            <button
                              className="flex items-center gap-1.5 border border-black/10 px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/45 hover:border-black/40 hover:text-[#111111] transition-colors ms-auto disabled:opacity-30"
                              disabled={createOrderMutation.isPending}
                              onClick={() => handleReorder(order as { items?: Array<{ productVariantId: number; quantity: number; price: number }> })}
                            >
                              <RefreshCw className="w-3 h-3" /> Reorder
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES */}
            {activeTab === "addresses" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-5 border-b border-black/6">
                  <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.savedAddresses")}</h2>
                  {!showAddressForm && !editingAddress && (
                    <button className="flex items-center gap-2 bg-[#111111] text-white px-5 py-2.5 text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#C9A227] transition-colors" onClick={() => setShowAddressForm(true)}>
                      <Plus className="w-3.5 h-3.5" /> {t("dash.addAddress")}
                    </button>
                  )}
                </div>
                {showAddressForm && <AddressForm initial={EMPTY_ADDRESS} onSave={(d) => createAddressMutation.mutate(d)} onCancel={() => setShowAddressForm(false)} isSaving={createAddressMutation.isPending} />}
                {!addresses?.length && !showAddressForm ? (
                  <div className="border border-dashed border-black/10 p-16 text-center">
                    <MapPin className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
                    <p className="text-xl font-bold text-[#111111] mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.noAddresses")}</p>
                    <button className="border border-[#111111]/20 px-8 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#111111] hover:text-white transition-colors" onClick={() => setShowAddressForm(true)}>{t("dash.addFirstAddress")}</button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addresses?.map(addr =>
                      editingAddress?.id === addr.id ? (
                        <div key={addr.id} className="col-span-full">
                          <AddressForm
                            initial={{ label: addr.label, firstName: addr.firstName, lastName: addr.lastName, address: addr.address, city: addr.city, phone: addr.phone, isDefault: addr.isDefault }}
                            onSave={(d) => updateAddressMutation.mutate({ id: addr.id, data: d })}
                            onCancel={() => setEditingAddress(null)}
                            isSaving={updateAddressMutation.isPending}
                          />
                        </div>
                      ) : (
                        <AddressCard key={addr.id} addr={addr} onEdit={() => setEditingAddress(addr)} onDelete={() => deleteAddressMutation.mutate(addr.id)} onSetDefault={() => updateAddressMutation.mutate({ id: addr.id, data: { isDefault: true } })} isLoading={deleteAddressMutation.isPending || updateAddressMutation.isPending} />
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === "wishlist" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-5 border-b border-black/6">
                  <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.myWishlist")}</h2>
                  {wishlist?.length ? <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-black/35">{wishlist.length} {wishlist.length !== 1 ? t("dash.items") : t("dash.item")}</span> : null}
                </div>
                {!wishlist?.length ? (
                  <div className="border border-dashed border-black/10 p-16 text-center">
                    <Heart className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
                    <p className="text-xl font-bold text-[#111111] mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.wishlistEmpty")}</p>
                    <Link href="/products" className="inline-flex bg-[#111111] text-white px-8 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors">{t("dash.discoverProducts")}</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {wishlist.map(item => (
                      <ProductCard key={item.productId} id={item.productId} nameEn={item.product.nameEn} nameAr={item.product.nameAr} price={item.product.price} salePrice={item.product.salePrice} imageUrl={item.product.images?.[0]?.imageUrl} categoryName={item.product.categoryName} variants={item.product.variants} averageRating={item.product.averageRating} reviewCount={item.product.reviewCount} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MY REVIEWS */}
            {activeTab === "my-reviews" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <MyReviewsTab userId={user.id} />
              </div>
            )}

            {/* SUPPORT */}
            {activeTab === "support" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <SupportTab userId={user.id} prefilledOrderId={supportOrderId} />
              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-5 border-b border-black/6">
                  <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.notifications")}</h2>
                  {unreadCount > 0 && <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-[#C9A227]">{unreadCount} {t("dash.unread")}</span>}
                </div>
                {!notifications?.length ? (
                  <div className="border border-dashed border-black/10 p-16 text-center">
                    <Bell className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
                    <p className="text-xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.noNotifications")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-6 border transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${notif.isRead ? "border-black/6 bg-white" : "border-[#C9A227]/30 bg-[#C9A227]/4"}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            {!notif.isRead && <span className="w-1.5 h-1.5 bg-[#C9A227] shrink-0" />}
                            <h4 className={`text-sm font-bold ${notif.isRead ? "text-black/50" : "text-[#111111]"}`}>{notif.title}</h4>
                          </div>
                          <p className="text-xs text-black/40 mb-2 tracking-wide">{notif.message}</p>
                          <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-black/25">{format(new Date(notif.createdAt), "MMMM dd, yyyy · HH:mm")}</p>
                        </div>
                        {!notif.isRead && (
                          <button
                            className="shrink-0 border border-[#C9A227]/40 text-[#C9A227] px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase hover:bg-[#C9A227] hover:text-white transition-colors"
                            onClick={() => handleMarkRead(notif.id)}
                          >
                            {t("dash.markRead")}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT HISTORY */}
            {activeTab === "payment-history" && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <PaymentHistoryTab />
                <div className="border-t border-black/6 pt-12">
                  <h3 className="text-2xl font-bold text-[#111111] mb-8 pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Saved Coupons</h3>
                  {!savedCoupons?.length ? (
                    <div className="border border-dashed border-black/10 p-12 text-center">
                      <p className="text-sm text-black/35 tracking-wide">No saved coupons yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedCoupons.map(c => (
                        <div key={c.id} className="border border-black/8 p-6 group bg-[#F7F6F4]">
                          <div className="flex justify-between items-start mb-4">
                            <span className="font-mono text-xl font-bold text-[#111111] tracking-wider">{c.couponCode}</span>
                            <button
                              onClick={() => apiFetch(`/api/saved-coupons/${c.couponCode}`, { method: "DELETE" }).then(() => refetchSavedCoupons())}
                              className="text-[9px] font-bold tracking-[0.18em] uppercase text-black/25 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Remove
                            </button>
                          </div>
                          {c.discountType && c.discountValue && (
                            <p className="font-bold text-[#C9A227] text-lg mb-2">
                              {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${Number(c.discountValue).toLocaleString()} EGP OFF`}
                            </p>
                          )}
                          {c.endDate && <p className="text-[9px] text-black/30 tracking-[0.18em] uppercase font-bold">Valid until {format(new Date(c.endDate), "MMM dd, yyyy")}</p>}
                          <div className="mt-3 flex gap-2">
                            {c.active === false && <span className="text-[9px] font-bold tracking-[0.15em] uppercase bg-black/6 text-black/35 px-2.5 py-1">Inactive</span>}
                            {c.endDate && new Date(c.endDate) < new Date() && <span className="text-[9px] font-bold tracking-[0.15em] uppercase bg-red-50 text-red-500 border border-red-200 px-2.5 py-1">Expired</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECURITY */}
            {activeTab === "security" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <SecurityCenterTab />
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-10 animate-in fade-in duration-300 max-w-2xl">
                <h2 className="text-2xl font-bold text-[#111111] pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.tab.profile")}</h2>

                {/* Name */}
                <div className="space-y-5">
                  <h3 className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/35">{t("dash.profileInfo")}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/38 block mb-2">{t("common.name")}</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full h-11 border border-black/10 bg-[#F7F6F4] px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors tracking-wide"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/38 block mb-2">{t("common.email")}</label>
                      <input
                        value={user.email}
                        disabled
                        className="w-full h-11 border border-black/8 bg-black/3 text-black/35 px-4 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updateUserMutation.isPending}
                    className="bg-[#111111] text-white px-8 py-3.5 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40"
                  >
                    {updateUserMutation.isPending ? t("dash.saving") : t("dash.saveChanges")}
                  </button>
                </div>

                {/* Email Preferences */}
                <div className="border-t border-black/6 pt-10 space-y-5">
                  <h3 className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/35">{t("dash.emailPrefs")}</h3>
                  <div className="space-y-4">
                    {[
                      { key: "orderUpdates" as const, label: t("dash.pref.orderUpdates"), desc: t("dash.pref.orderUpdatesDesc") },
                      { key: "promotions" as const, label: t("dash.pref.promotions"), desc: t("dash.pref.promotionsDesc") },
                      { key: "securityAlerts" as const, label: t("dash.pref.securityAlerts"), desc: t("dash.pref.securityAlertsDesc") },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-start gap-4 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            checked={prefs[key]}
                            onChange={e => updateEmailPrefsMutation.mutate({ [key]: e.target.checked })}
                            className="peer appearance-none w-4 h-4 border border-black/20 checked:bg-[#111111] checked:border-[#111111] transition-colors cursor-pointer"
                          />
                          <Check className="absolute inset-0 m-auto w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#111111] tracking-wide">{label}</p>
                          <p className="text-[9px] text-black/38 tracking-wide mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── My Reviews Tab ─────────────────────────────────────────────────────────────
type MyReview = { id: number; productId: number; productNameEn?: string | null; productImageUrl?: string | null; rating: number; title?: string | null; comment?: string | null; verifiedPurchase: boolean; createdAt: string };
function MyReviewsTab({ userId }: { userId: number }) {
  void userId;
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useGetMyReviews({ query: { queryKey: getGetMyReviewsQueryKey() } });
  const updateMutation = useUpdateReview();
  const deleteMutation = useDeleteReview();
  const [editTarget, setEditTarget] = useState<MyReview | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, title: "", comment: "" });
  const [hovered, setHovered] = useState(0);

  const handleDelete = (id: number, productId: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("reviews.deleted") });
        qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
        qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
      },
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate({ id: editTarget.id, data: { rating: editForm.rating, title: editForm.title || undefined, comment: editForm.comment } }, {
      onSuccess: () => {
        toast({ title: t("reviews.updated") });
        setEditTarget(null);
        qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProductQueryKey(editTarget.productId) });
      },
    });
  };

  if (isLoading) return <div className="p-16 text-center text-[9px] font-bold tracking-[0.25em] uppercase text-black/35">{t("dash.loading")}</div>;

  const reviewList = (reviews ?? []) as unknown as MyReview[];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-[#111111] pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t("dash.tab.myReviews")}</h2>

      {!reviewList.length ? (
        <div className="border border-dashed border-black/10 p-16 text-center">
          <Star className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
          <p className="text-xl font-bold text-[#111111] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No reviews yet</p>
          <p className="text-[9px] text-black/35 tracking-[0.2em] uppercase font-bold">Reviews you write will appear here</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviewList.map(review => (
            <div key={review.id} className="border border-black/8 p-6">
              <div className="flex gap-4 mb-4">
                {review.productImageUrl && (
                  <div className="w-14 shrink-0 bg-[#F7F6F4] overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    <img src={review.productImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#111111] mb-1 tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{review.productNameEn}</p>
                  <div className="flex items-center gap-2">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? "fill-[#C9A227] text-[#C9A227]" : "text-black/12"}`} />)}
                    <span className="text-[9px] text-black/30 tracking-[0.15em] uppercase font-bold ms-1">{format(new Date(review.createdAt), "MMM dd, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditTarget(review); setEditForm({ rating: review.rating, title: review.title ?? "", comment: review.comment ?? "" }); }}
                    className="p-2 text-black/25 hover:text-[#111111] transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(review.id, review.productId)} className="p-2 text-black/25 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {review.title && <p className="text-sm font-bold text-[#111111] mb-1">{review.title}</p>}
              {review.comment && <p className="text-xs text-black/45 leading-relaxed tracking-wide">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white w-full sm:max-w-lg mx-4 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Edit Review</h3>
              <button onClick={() => setEditTarget(null)} className="text-black/30 hover:text-black"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/38 block mb-3">{t("reviews.rating")}</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(0)} onClick={() => setEditForm(f => ({ ...f, rating: i }))}>
                      <Star className={`w-7 h-7 transition-colors ${i <= (hovered || editForm.rating) ? "fill-[#C9A227] text-[#C9A227]" : "text-black/12"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/38 block mb-2">Title</label>
                <input type="text" maxLength={120} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="w-full h-11 border border-black/10 bg-[#F7F6F4] px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/38 block mb-2">Comment</label>
                <textarea rows={4} maxLength={2000} value={editForm.comment} onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))} className="w-full border border-black/10 bg-[#F7F6F4] px-4 py-3 text-sm focus:outline-none focus:border-[#111111] transition-colors resize-none" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-black/6">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-4 border border-black/10 text-[9px] font-bold tracking-[0.22em] uppercase text-black/40 hover:border-black/30">{t("dash.cancel")}</button>
                <button type="submit" className="flex-1 py-4 bg-[#111111] text-white text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t("dash.saving") : "Update Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Support Tab ─────────────────────────────────────────────────────────────────
type SupportTicket = { id: number; subject: string; category: string; status: string; priority: string; orderId?: number | null; closedAt?: string | null; createdAt: string; updatedAt: string };
type TicketMsg = { id: number; ticketId: number; senderId: number; message: string; createdAt: string; senderName?: string; senderRole?: string };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-black/4 text-black/60 border-black/8",
  in_progress: "bg-[#C9A227]/8 text-[#9a7a1a] border-[#C9A227]/25",
  waiting_customer: "bg-black/4 text-black/45 border-black/8",
  waiting_admin: "bg-black/4 text-black/45 border-black/8",
  resolved: "bg-[#C9A227]/8 text-[#9a7a1a] border-[#C9A227]/25",
  closed: "bg-black/4 text-black/30 border-black/6",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", waiting_customer: "Waiting on You", waiting_admin: "Awaiting Reply", resolved: "Resolved", closed: "Closed",
};

function SupportTab({ userId, prefilledOrderId }: { userId: number; prefilledOrderId?: number | null }) {
  void userId;
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showNew, setShowNew] = useState(!!prefilledOrderId);
  const [newForm, setNewForm] = useState({ subject: prefilledOrderId ? `Issue with Order #${prefilledOrderId}` : "", category: "order", message: "", orderId: prefilledOrderId ? String(prefilledOrderId) : "" });
  const [creating, setCreating] = useState(false);
  const { data: myOrders } = useQuery<Array<{ id: number; createdAt: string }>>({
    queryKey: ["support-orders"],
    queryFn: () => apiFetch("/api/orders"),
    select: (d: unknown) => ((d as { orders?: Array<{ id: number; createdAt: string }> }).orders ?? []).slice(0, 20),
  });

  const load = async () => {
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${BASE}/api/support/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTickets((await res.json()) as SupportTicket[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const openTicket = async (tkt: SupportTicket) => {
    setSelected(tkt);
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${BASE}/api/support/tickets/${tkt.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMessages((await res.json()) as TicketMsg[]);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setReplyPending(true);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${BASE}/api/support/tickets/${selected.id}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      if (res.ok) { const msg = await res.json() as TicketMsg; setReply(""); setMessages(m => [...m, msg]); }
      else throw new Error();
    } catch { toast({ title: t("dash.replyFailed") || "Failed to send", variant: "destructive" }); }
    finally { setReplyPending(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.subject.trim() || !newForm.message.trim()) { toast({ title: "Subject and message are required", variant: "destructive" }); return; }
    setCreating(true);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newForm.subject, category: newForm.category, message: newForm.message, orderId: newForm.orderId && newForm.orderId !== "none" ? Number(newForm.orderId) : undefined }),
      });
      if (res.ok) { toast({ title: "Ticket opened" }); setShowNew(false); setNewForm({ subject: "", category: "general", message: "", orderId: "" }); void load(); }
      else throw new Error();
    } catch { toast({ title: "Failed to open ticket", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const handleCloseTicket = async () => {
    if (!selected) return;
    setClosing(true);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${BASE}/api/support/tickets/${selected.id}/status`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) { toast({ title: "Ticket closed" }); setSelected(prev => prev ? { ...prev, status: "closed" } : null); void load(); }
    } finally { setClosing(false); }
  };

  if (loading) return <div className="p-16 text-center text-[9px] font-bold tracking-[0.25em] uppercase text-black/35">{t("dash.loading")}</div>;

  const fieldClass = "w-full h-11 border border-black/10 bg-[#F7F6F4] px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors tracking-wide";
  const labelClass = "text-[9px] font-bold tracking-[0.25em] uppercase text-black/38 block mb-2";

  if (showNew) {
    return (
      <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
        <div className="flex items-center gap-4 pb-5 border-b border-black/6">
          <button onClick={() => setShowNew(false)} className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-black transition-colors">← Back</button>
          <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Open Support Ticket</h2>
        </div>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Category</label>
              <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11 border-black/10 bg-[#F7F6F4] text-[9px] font-bold tracking-[0.18em] uppercase focus:ring-0 focus:border-[#111111]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-black/10">
                  {["general", "order", "payment", "returns", "account"].map(v => (
                    <SelectItem key={v} value={v} className="text-[9px] font-bold uppercase tracking-widest">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newForm.category === "order" && myOrders && (
              <div>
                <label className={labelClass}>Related Order</label>
                <Select value={newForm.orderId} onValueChange={v => setNewForm(f => ({ ...f, orderId: v }))}>
                  <SelectTrigger className="h-11 border-black/10 bg-[#F7F6F4] text-[9px] font-bold tracking-[0.18em] uppercase focus:ring-0 focus:border-[#111111]">
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent className="border-black/10">
                    <SelectItem value="none" className="text-[9px] font-bold uppercase tracking-widest">None</SelectItem>
                    {myOrders.map(o => (
                      <SelectItem key={o.id} value={String(o.id)} className="text-[9px] font-bold uppercase tracking-widest">
                        Order #{o.id} · {format(new Date(o.createdAt), "MMM d, yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Subject *</label>
            <input className={fieldClass} value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} placeholder="Briefly describe your issue..." />
          </div>
          <div>
            <label className={labelClass}>Message *</label>
            <textarea rows={5} value={newForm.message} onChange={e => setNewForm(f => ({ ...f, message: e.target.value }))} className="w-full border border-black/10 bg-[#F7F6F4] px-4 py-3 text-sm focus:outline-none focus:border-[#111111] transition-colors resize-none tracking-wide" placeholder="Describe your issue in detail..." />
          </div>
          <button type="submit" className="w-full bg-[#111111] text-white py-4 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40" disabled={creating}>
            {creating ? "Opening..." : "Open Ticket"}
          </button>
        </form>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelected(null)} className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-black transition-colors shrink-0">← Back</button>
            <div>
              <h2 className="text-xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{selected.subject}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-[9px] text-black/35 font-bold tracking-[0.18em] uppercase flex-wrap">
                <span>Ticket #{selected.id}</span>
                <span className={`px-2 py-0.5 border ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status] || selected.status}</span>
                {selected.orderId && <><span>·</span><Link href={`/track-order/${selected.orderId}`} className="text-[#C9A227] hover:underline">Order #{selected.orderId}</Link></>}
              </div>
            </div>
          </div>
          {selected.status !== "closed" && (
            <button onClick={handleCloseTicket} disabled={closing} className="border border-black/10 px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/40 hover:border-black/30 transition-colors disabled:opacity-40">
              Close Ticket
            </button>
          )}
        </div>

        <div className="space-y-5 max-w-2xl">
          {messages.map((m, i) => {
            const isMe = m.senderRole === "customer";
            return (
              <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-black/25 mb-1.5 px-1">
                  {isMe ? "You" : m.senderName || "Support"} · {format(new Date(m.createdAt), "MMM d, h:mm a")}
                </div>
                <div className={`px-5 py-4 max-w-[80%] ${isMe ? "bg-[#111111] text-white" : "bg-[#F7F6F4] text-[#111111] border border-black/8"}`}>
                  <p className="text-sm leading-relaxed tracking-wide whitespace-pre-wrap">{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selected.status !== "closed" && (
          <form onSubmit={handleReply} className="flex gap-3 max-w-2xl items-end">
            <div className="flex-1">
              <label className={labelClass}>Reply</label>
              <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." className="w-full border border-black/10 bg-[#F7F6F4] px-4 py-3 text-sm focus:outline-none focus:border-[#111111] transition-colors resize-none tracking-wide" />
            </div>
            <button type="submit" className="h-11 px-6 bg-[#111111] text-white text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#C9A227] transition-colors flex items-center gap-2 disabled:opacity-40" disabled={replyPending || !reply.trim()}>
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-5 border-b border-black/6">
        <h2 className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Support</h2>
        <button className="flex items-center gap-2 bg-[#111111] text-white px-5 py-2.5 text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#C9A227] transition-colors" onClick={() => setShowNew(true)}>
          <Plus className="w-3.5 h-3.5" /> New Ticket
        </button>
      </div>

      {!tickets.length ? (
        <div className="border border-dashed border-black/10 p-16 text-center">
          <MessageCircle className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
          <p className="text-xl font-bold text-[#111111] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No tickets yet</p>
          <p className="text-[9px] text-black/35 tracking-[0.2em] uppercase font-bold mb-8">Open a ticket if you need help</p>
          <button className="border border-[#111111]/15 px-8 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#111111] hover:text-white transition-colors" onClick={() => setShowNew(true)}>Open First Ticket</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(tkt => (
            <div key={tkt.id} className="border border-black/8 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-black/25 transition-colors cursor-pointer" onClick={() => openTicket(tkt)}>
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase border ${STATUS_COLORS[tkt.status]}`}>{STATUS_LABELS[tkt.status] || tkt.status}</span>
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-black/30">Ticket #{tkt.id}</span>
                </div>
                <p className="text-sm font-bold text-[#111111] mb-1 tracking-wide">{tkt.subject}</p>
                <p className="text-[9px] text-black/30 tracking-[0.15em] uppercase font-bold">{format(new Date(tkt.createdAt), "MMM d, yyyy")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-black/20 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment History Tab ──────────────────────────────────────────────────────
interface PaymobEntry { id: number; orderId: number; amountCents: number; currency: string; status: string; method: string; createdAt: string; }
interface ManualEntry { id: number; orderId: number; method: string; status: string; referenceNumber: string | null; adminNote: string | null; createdAt: string; orderTotal: string; }

function PaymentHistoryTab() {
  const { t } = useTranslation();
  const [paymob, setPaymob] = useState<PaymobEntry[]>([]);
  const [manual, setManual] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ paymob: PaymobEntry[]; manual: ManualEntry[] }>("/api/payments/my");
        setPaymob(data.paymob ?? []); setManual(data.manual ?? []);
      } finally { setLoading(false); }
    })();
  }, []);

  const statusStyle = (s: string) =>
    s === "success" || s === "approved" ? "bg-[#C9A227]/8 text-[#9a7a1a] border-[#C9A227]/25"
    : s === "failed" ? "bg-red-50 text-red-600 border-red-200"
    : "bg-black/4 text-black/45 border-black/8";

  const methodLabel = (m: string) =>
    m === "vodafone_cash" ? "Vodafone Cash" : m === "etisalat_cash" ? "Etisalat Cash" : m === "instapay" ? "InstaPay" : m === "card" ? "Card" : m;

  if (loading) return <div className="p-16 text-center text-[9px] font-bold tracking-[0.25em] uppercase text-black/35">{t("dash.loading")}</div>;

  const isEmpty = paymob.length === 0 && manual.length === 0;
  if (isEmpty) return (
    <div className="border border-dashed border-black/10 p-16 text-center">
      <CreditCard className="w-8 h-8 text-black/15 mx-auto mb-5" strokeWidth={1} />
      <p className="text-xl font-bold text-[#111111] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No payment records</p>
      <p className="text-[9px] text-black/35 tracking-[0.2em] uppercase font-bold">Your payment history will appear here</p>
    </div>
  );

  return (
    <div className="space-y-12">
      <h2 className="text-2xl font-bold text-[#111111] pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Payment History</h2>
      {paymob.length > 0 && (
        <div>
          <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/35 mb-4">Card (Paymob)</p>
          <div className="border border-black/8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F6F4]">
                <tr>
                  {["Order", "Method", "Amount", "Status", "Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-start text-[9px] font-bold tracking-[0.2em] uppercase text-black/35 border-b border-black/6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {paymob.map(p => (
                  <tr key={p.id} className="hover:bg-[#F7F6F4] transition-colors">
                    <td className="px-5 py-4 font-bold text-[#111111]">#{p.orderId}</td>
                    <td className="px-5 py-4 text-black/40 text-xs tracking-wide capitalize">{methodLabel(p.method)}</td>
                    <td className="px-5 py-4 font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{(p.amountCents / 100).toFixed(2)} <span className="text-[9px] font-sans font-normal text-black/35">EGP</span></td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase border ${statusStyle(p.status)}`}>{p.status}</span></td>
                    <td className="px-5 py-4 text-[9px] text-black/30 tracking-[0.15em] uppercase font-bold">{format(new Date(p.createdAt), "MMM dd, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {manual.length > 0 && (
        <div>
          <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/35 mb-4">Manual Transfer</p>
          <div className="border border-black/8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F6F4]">
                <tr>
                  {["Order", "Method", "Amount", "Reference", "Status", "Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-start text-[9px] font-bold tracking-[0.2em] uppercase text-black/35 border-b border-black/6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {manual.map(m => (
                  <tr key={m.id} className="hover:bg-[#F7F6F4] transition-colors">
                    <td className="px-5 py-4 font-bold text-[#111111]">#{m.orderId}</td>
                    <td className="px-5 py-4 text-black/40 text-xs tracking-wide capitalize">{methodLabel(m.method)}</td>
                    <td className="px-5 py-4 font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{Number(m.orderTotal).toFixed(2)} <span className="text-[9px] font-sans font-normal text-black/35">EGP</span></td>
                    <td className="px-5 py-4 text-[9px] font-mono text-black/40 tracking-wider">{m.referenceNumber ?? "—"}</td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase border ${statusStyle(m.status)}`}>{m.status}</span></td>
                    <td className="px-5 py-4 text-[9px] text-black/30 tracking-[0.15em] uppercase font-bold">{format(new Date(m.createdAt), "MMM dd, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
