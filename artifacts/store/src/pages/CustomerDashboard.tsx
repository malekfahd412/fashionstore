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
import { Button } from "@/components/ui/button";
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
  TrendingUp, Clock, Check, PenLine, CheckCircle2, X, FileDown, Headphones, Send, MessageCircle, CreditCard, ChevronRight
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
  id: number;
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  phone: string;
  isDefault: boolean;
};

type AddressFormData = Omit<UserAddress, "id" | "isDefault"> & { isDefault: boolean };

const EMPTY_ADDRESS: AddressFormData = {
  label: "Home", firstName: "", lastName: "", address: "", city: "Cairo", phone: "", isDefault: false,
};

const STATUS_STEPS = ["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

function PaymentStatusBadge({ paymentStatus, orderStatus }: { paymentStatus?: string | null; orderStatus: string }) {
  const { t } = useTranslation();
  if (paymentStatus === "cod") {
    return orderStatus === "delivered"
      ? <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-none">{t("dash.codPaid")}</span>
      : <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted border border-border px-2 py-1 rounded-none">{t("dash.payOnDelivery")}</span>;
  }
  if (paymentStatus === "paid") return <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-none">{t("dash.paid")}</span>;
  if (paymentStatus === "failed") return <span className="text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1 rounded-none">{t("dash.paymentFailed")}</span>;
  return <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-none">{t("dash.paymentPending")}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    processing: "bg-amber-50 text-amber-700 border-amber-200",
    packed: "bg-teal-50 text-teal-700 border-teal-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    out_for_delivery: "bg-orange-50 text-orange-700 border-orange-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-none ${COLORS[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function AddressCard({ addr, onEdit, onDelete, onSetDefault, isLoading }: {
  addr: UserAddress; onEdit: () => void; onDelete: () => void; onSetDefault: () => void; isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`border p-6 relative ${addr.isDefault ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
      {addr.isDefault && (
        <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          <Star className="w-3 h-3 fill-primary" /> {t("dash.addr.default")}
        </span>
      )}
      <div className="flex items-start gap-4 mb-4">
        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-serif text-lg font-bold mb-1">{addr.label}</p>
          <p className="text-sm font-medium">{addr.firstName} {addr.lastName}</p>
          <p className="text-sm text-muted-foreground mt-1">{addr.address}, {addr.city}</p>
          <p className="text-sm text-muted-foreground">{addr.phone}</p>
        </div>
      </div>
      <div className="flex gap-4 mt-6 pt-4 border-t border-border">
        {!addr.isDefault && (
          <button onClick={onSetDefault} disabled={isLoading} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
            {t("dash.addr.setAsDefault")}
          </button>
        )}
        <div className="flex gap-4 ml-auto">
          <button onClick={onEdit} disabled={isLoading} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <Pencil className="w-3 h-3" /> {t("dash.addr.edit")}
          </button>
          <button onClick={onDelete} disabled={isLoading} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50">
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

  return (
    <div className="border border-border p-8 space-y-6 bg-muted/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.label")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.label} onChange={e => set("label", e.target.value)} placeholder={t("dash.addr.labelPlaceholder")} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.firstName")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.lastName")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.address")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Fashion St" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.city")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cairo" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("dash.addr.phone")}</label>
          <Input className="h-12 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+20 100 000 0000" />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm cursor-pointer font-medium">
        <div className="relative flex items-center justify-center">
          <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="peer appearance-none w-5 h-5 border border-border rounded-none checked:bg-primary checked:border-primary transition-colors" />
          <Check className="absolute w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </div>
        {t("dash.addr.setDefault")}
      </label>
      <div className="flex gap-4 pt-4 border-t border-border">
        <Button className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs font-bold" onClick={() => onSave(form)} disabled={isSaving || !form.firstName || !form.lastName || !form.address || !form.city || !form.phone}>
          {isSaving ? t("dash.addr.saving") : t("dash.addr.save")}
        </Button>
        <Button className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs font-bold border-border" variant="outline" onClick={onCancel} disabled={isSaving}>{t("dash.cancel")}</Button>
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
  const alertParam = searchParams.get("alert");

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

  useEffect(() => {
    if (!user) setLocation("/login?from=/dashboard/customer");
  }, [user, setLocation]);

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
      onSuccess: () => {
        toast({ title: t("dash.removedWishlist") });
        qc.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
        refetchWishlist();
      },
    });
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        refetchNotifications();
      },
    });
  };

  const handleReorder = (order: { items?: Array<{ productVariantId: number; quantity: number; price: number }> }) => {
    if (!order.items?.length) return;
    const items = order.items.map(i => ({ productVariantId: i.productVariantId, quantity: i.quantity }));
    createOrderMutation.mutate(
      { data: { items, paymentMethod: "cash_on_delivery" } },
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
    <div className="container mx-auto px-4 py-16 max-w-[1400px]">
      <div className="mb-12 pb-8 border-b border-border">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 uppercase tracking-widest">{t("dash.myAccount")}</h1>
        <p className="text-muted-foreground text-lg">{t("dash.welcomeBack")} <span className="font-medium text-foreground">{user.name}</span></p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex overflow-x-auto pb-4 -mx-4 px-4 space-x-2 no-scrollbar">
          {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === value ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge ? <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 ml-1">{badge}</span> : null}
            </button>
          ))}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 space-y-1">
          {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex items-center gap-4 px-5 py-4 w-full text-left text-sm font-bold uppercase tracking-widest transition-all ${
                activeTab === value 
                  ? "bg-foreground text-background pl-8" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {badge ? <span className={`text-[10px] px-2 py-0.5 ${activeTab === value ? "bg-background text-foreground" : "bg-primary text-primary-foreground"}`}>{badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          
          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: t("dash.totalOrders"), value: allOrders.length, icon: ShoppingBag },
                  { label: t("dash.activeOrders"), value: activeOrders.length, icon: Clock },
                  { label: t("dash.wishlistItems"), value: wishlist?.length ?? 0, icon: Heart },
                  { label: "Notifications", value: unreadCount, icon: Bell },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="border border-border p-6 bg-muted/10">
                    <Icon className="w-6 h-6 text-primary mb-4" />
                    <p className="text-3xl font-serif font-bold mb-2">{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Active Orders Widget */}
              {activeOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-6 pb-2 border-b border-border">{t("dash.activeShipments")}</h3>
                  <div className="space-y-4">
                    {activeOrders.map(order => {
                      const stepIdx = STATUS_STEPS.indexOf(order.status);
                      const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                      return (
                        <div key={order.id} className="border border-border p-6 bg-background">
                          <div className="flex items-center justify-between mb-6">
                            <span className="font-serif text-xl font-bold">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="space-y-3">
                            <div className="h-2 bg-muted overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <span>{t("dash.placed")}</span>
                              <span>{progress}%</span>
                              <span>{t("dash.deliveredLabel")}</span>
                            </div>
                          </div>
                          <div className="mt-6 pt-4 border-t border-border">
                            <Button variant="link" className="p-0 h-auto text-xs font-bold uppercase tracking-widest text-primary" onClick={() => { setOrderSearch(String(order.id)); setActiveTab("orders"); }}>
                              {t("dash.fullDetails")} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent orders */}
              <div>
                <div className="flex justify-between items-end mb-6 pb-2 border-b border-border">
                  <h3 className="text-sm font-bold uppercase tracking-widest">{t("dash.recentOrders")}</h3>
                  <button onClick={() => setActiveTab("orders")} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                    {t("dash.viewAll")}
                  </button>
                </div>
                {!allOrders.length ? (
                  <div className="border border-border p-12 text-center bg-muted/10">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-sm mb-6">{t("dash.noOrders")}</p>
                    <Button className="rounded-none uppercase tracking-widest text-xs font-bold px-8 h-12" asChild><Link href="/products">{t("dash.startShopping")}</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allOrders.slice(0, 3).map(order => (
                      <div key={order.id} className="border border-border px-6 py-5 flex items-center justify-between gap-6 group hover:border-foreground transition-colors">
                        <div>
                          <p className="font-serif text-lg font-bold mb-2">Order #{order.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "MMM dd, yyyy")} · <span className="font-bold text-foreground">{Number(order.totalPrice).toLocaleString()} EGP</span>
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS ─────────────────────────────────────────────────────── */}
          {activeTab === "orders" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-serif font-bold uppercase tracking-widest pb-4 border-b border-border">{t("dash.myOrders")}</h2>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-4 bg-muted/10 p-4 border border-border">
                <Input
                  placeholder={t("dash.searchOrders") || "Search orders..."}
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="sm:max-w-xs h-12 rounded-none border-border focus-visible:ring-primary bg-background uppercase tracking-widest text-xs"
                />
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="sm:w-64 h-12 rounded-none border-border bg-background uppercase tracking-widest text-xs font-bold">
                    <SelectValue placeholder={t("dash.filterByStatus") || "Filter by status"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-border">
                    <SelectItem value="all" className="uppercase tracking-widest text-xs font-bold">{t("dash.allStatuses") || "All Statuses"}</SelectItem>
                    {["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"].map(s => (
                      <SelectItem key={s} value={s} className="uppercase tracking-widest text-xs font-bold">{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!filteredOrders.length ? (
                <div className="bg-muted/10 p-16 text-center border border-border">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
                  <p className="text-muted-foreground font-serif text-2xl mb-8">
                    {allOrders.length === 0 ? (t("dash.noOrdersYet") || "No orders yet.") : (t("dash.noOrdersMatch") || "No orders match your filters.")}
                  </p>
                  {allOrders.length === 0 && (
                    <Button className="rounded-none uppercase tracking-widest text-xs font-bold px-10 h-14" asChild><Link href="/products">{t("dash.startShopping")}</Link></Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map(order => (
                    <div key={order.id} className="border border-border p-6 md:p-8 bg-background shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between border-b border-border pb-6 mb-6">
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <span className="font-serif text-2xl font-bold">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                            <PaymentStatusBadge
                              paymentStatus={(order as unknown as { paymentStatus?: string }).paymentStatus}
                              orderStatus={order.status}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-bold text-foreground">{t("dash.placed") || "Placed"}:</span> {format(new Date(order.createdAt), "MMMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-3xl font-serif font-bold text-primary">{Number(order.totalPrice).toLocaleString()} EGP</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                            {order.items?.length || 0} {(order.items?.length || 0) !== 1 ? (t("dash.items") || "items") : (t("dash.item") || "item")} · {order.paymentMethod.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>

                      {/* Item thumbnails */}
                      <div className="flex gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar">
                        {(order.items as unknown as Array<{ productVariantId: number; imageUrl?: string | null; nameEn?: string }>).map((item, i) => (
                          <div key={i} className="w-20 aspect-[3/4] bg-muted shrink-0 overflow-hidden border border-border">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                        <Button className="rounded-none uppercase tracking-widest text-[10px] font-bold h-10 px-6" asChild>
                          <Link href={`/track-order/${order.id}`}>Track Order <ChevronRight className="w-3 h-3 ml-2"/></Link>
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-none uppercase tracking-widest text-[10px] font-bold h-10 px-6 border-border"
                          onClick={() => { setSupportOrderId(order.id); setActiveTab("support"); }}
                        >
                          <Headphones className="w-3 h-3 mr-2" /> Support
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-none uppercase tracking-widest text-[10px] font-bold h-10 px-6 border-border"
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
                          <FileDown className="w-3 h-3 mr-2" /> Invoice
                        </Button>
                        {["delivered", "cancelled"].includes(order.status) && (
                          <Button
                            variant="outline"
                            className="rounded-none uppercase tracking-widest text-[10px] font-bold h-10 px-6 border-border ml-auto"
                            disabled={createOrderMutation.isPending}
                            onClick={() => handleReorder(order as { items?: Array<{ productVariantId: number; quantity: number; price: number }> })}
                          >
                            <RefreshCw className="w-3 h-3 mr-2" /> Reorder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADDRESSES ────────────────────────────────────────────────── */}
          {activeTab === "addresses" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">{t("dash.savedAddresses")}</h2>
                {!showAddressForm && !editingAddress && (
                  <Button className="rounded-none uppercase tracking-widest text-xs font-bold h-10" onClick={() => setShowAddressForm(true)}>
                    <Plus className="w-4 h-4 mr-2" /> {t("dash.addAddress")}
                  </Button>
                )}
              </div>
              
              {showAddressForm && (
                <AddressForm initial={EMPTY_ADDRESS} onSave={(d) => createAddressMutation.mutate(d)} onCancel={() => setShowAddressForm(false)} isSaving={createAddressMutation.isPending} />
              )}
              
              {!addresses?.length && !showAddressForm ? (
                <div className="bg-muted/10 p-16 text-center border border-border">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
                  <p className="text-muted-foreground font-serif text-2xl mb-8">{t("dash.noAddresses")}</p>
                  <Button className="rounded-none uppercase tracking-widest text-xs font-bold h-12 px-8" variant="outline" onClick={() => setShowAddressForm(true)}>
                    {t("dash.addFirstAddress")}
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
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

          {/* ── WISHLIST ──────────────────────────────────────────────────── */}
          {activeTab === "wishlist" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">{t("dash.myWishlist")}</h2>
                {wishlist?.length ? <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{wishlist.length} {wishlist.length !== 1 ? t("dash.items") : t("dash.item")}</span> : null}
              </div>
              
              {!wishlist?.length ? (
                <div className="bg-muted/10 p-16 text-center border border-border">
                  <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
                  <p className="text-muted-foreground font-serif text-2xl mb-8">{t("dash.wishlistEmpty")}</p>
                  <Button className="rounded-none uppercase tracking-widest text-xs font-bold h-12 px-8" asChild><Link href="/products">{t("dash.discoverProducts")}</Link></Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {wishlist.map(item => (
                    <ProductCard
                      key={item.productId}
                      id={item.productId}
                      nameEn={item.product.nameEn}
                      nameAr={item.product.nameAr}
                      price={item.product.price}
                      salePrice={item.product.salePrice}
                      imageUrl={item.product.images?.[0]?.imageUrl}
                      categoryName={item.product.categoryName}
                      variants={item.product.variants}
                      averageRating={item.product.averageRating}
                      reviewCount={item.product.reviewCount}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MY REVIEWS ────────────────────────────────────────────────── */}
          {activeTab === "my-reviews" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <MyReviewsTab userId={user.id} />
            </div>
          )}

          {/* ── SUPPORT ───────────────────────────────────────────────────── */}
          {activeTab === "support" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <SupportTab userId={user.id} prefilledOrderId={supportOrderId} />
            </div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">{t("dash.notifications")}</h2>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">{unreadCount} {t("dash.unread")}</span>
                )}
              </div>
              
              {!notifications?.length ? (
                <div className="bg-muted/10 p-16 text-center border border-border">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
                  <p className="text-muted-foreground font-serif text-2xl">{t("dash.noNotifications")}</p>
                </div>
              ) : (() => {
                const orderGroups = new Map<string, typeof notifications>();
                const general: typeof notifications = [];
                for (const n of notifications) {
                  const match = n.message.match(/order #(\d+)/i) ?? n.title.match(/order #(\d+)/i);
                  if (match) {
                    const key = `Order #${match[1]}`;
                    if (!orderGroups.has(key)) orderGroups.set(key, []);
                    orderGroups.get(key)!.push(n);
                  } else {
                    general.push(n);
                  }
                }
                const sections: Array<{ label: string | null; items: typeof notifications }> = [];
                orderGroups.forEach((items, label) => sections.push({ label, items }));
                sections.sort((a, b) => {
                  const aTime = Math.max(...a.items.map(i => new Date(i.createdAt).getTime()));
                  const bTime = Math.max(...b.items.map(i => new Date(i.createdAt).getTime()));
                  return bTime - aTime;
                });
                if (general.length) sections.push({ label: null, items: general });
                return (
                  <div className="space-y-10">
                    {sections.map((section, si) => (
                      <div key={si} className="space-y-4">
                        {section.label && (
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">{section.label}</h3>
                        )}
                        <div className="space-y-3">
                          {section.items.map(notif => (
                            <div key={notif.id} className={`p-6 border transition-colors ${notif.isRead ? "border-border bg-background" : "border-primary bg-primary/5 shadow-sm"} flex flex-col sm:flex-row justify-between sm:items-center gap-4`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                  <h4 className={`font-bold ${notif.isRead ? "text-muted-foreground" : "text-foreground"}`}>{notif.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{notif.message}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{format(new Date(notif.createdAt), "MMMM dd, yyyy · HH:mm")}</p>
                              </div>
                              {!notif.isRead && (
                                <Button variant="outline" className="shrink-0 rounded-none uppercase tracking-widest text-[10px] font-bold h-10 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => handleMarkRead(notif.id)}>
                                  {t("dash.markRead")}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── PAYMENT HISTORY ───────────────────────────────────────────── */}
          {activeTab === "payment-history" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <PaymentHistoryTab />
              
              {/* Saved Coupons */}
              <div className="border-t border-border pt-10 mt-10">
                <h3 className="text-2xl font-serif font-bold uppercase tracking-widest mb-6 pb-4 border-b border-border">Saved Coupons</h3>
                {!savedCoupons?.length ? (
                  <div className="bg-muted/10 p-12 text-center border border-border">
                    <p className="text-muted-foreground font-medium">No saved coupons yet. Coupons you save will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedCoupons.map(c => (
                      <div key={c.id} className="border border-border p-6 bg-background relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-muted/20 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-mono text-xl font-bold tracking-wider">{c.couponCode}</span>
                          <button
                            onClick={() => apiFetch(`/api/saved-coupons/${c.couponCode}`, { method: "DELETE" }).then(() => refetchSavedCoupons())}
                            className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        </div>
                        {c.discountType && c.discountValue && (
                          <div className="space-y-2">
                            <p className="font-bold text-emerald-600 text-lg">
                              {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${Number(c.discountValue).toLocaleString()} EGP OFF`}
                            </p>
                            {c.endDate && <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Valid until {format(new Date(c.endDate), "MMM dd, yyyy")}</p>}
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-border flex gap-2">
                          {c.active === false && <span className="text-[10px] font-bold uppercase tracking-widest bg-muted px-2 py-1">Inactive</span>}
                          {c.endDate && new Date(c.endDate) < new Date() && <span className="text-[10px] font-bold uppercase tracking-widest bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1">Expired</span>}
                          {c.active !== false && (!c.endDate || new Date(c.endDate) > new Date()) && <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1">Active</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <SecurityCenterTab showAlert={alertParam === "1"} />
            </div>
          )}

          {/* ── PROFILE / ACCOUNT SETTINGS ────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl">
              <div>
                <h2 className="text-2xl font-serif font-bold uppercase tracking-widest pb-4 border-b border-border mb-8">{t("dash.accountSettings")}</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">{t("dash.fullName")}</label>
                    <Input className="h-14 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary text-base" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">{t("dash.emailAddress")}</label>
                    <Input className="h-14 rounded-none border-border bg-muted/30 text-muted-foreground text-base" value={user.email} disabled />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">{t("dash.emailNote")}</p>
                  </div>
                  <Button className="h-14 px-10 rounded-none uppercase tracking-widest text-xs font-bold mt-4" onClick={handleUpdateProfile} disabled={updateUserMutation.isPending || name === user.name}>
                    {updateUserMutation.isPending ? t("dash.saving") : t("dash.saveChanges")}
                  </Button>
                </div>
              </div>

              <div className="pt-10 border-t border-border">
                <h3 className="text-xl font-serif font-bold uppercase tracking-widest mb-2">{t("dash.emailNotifications")}</h3>
                <p className="text-sm text-muted-foreground mb-8">{t("dash.emailNotificationsDesc")}</p>
                <div className="space-y-6">
                  {([
                    { key: "orderUpdates" as const, label: t("dash.emailPref.orderUpdates"), desc: t("dash.emailPref.orderUpdatesDesc") },
                    { key: "promotions" as const, label: t("dash.emailPref.promotions"), desc: t("dash.emailPref.promotionsDesc") },
                    { key: "securityAlerts" as const, label: t("dash.emailPref.securityAlerts"), desc: t("dash.emailPref.securityAlertsDesc") },
                  ] as const).map(({ key, label, desc }) => (
                    <label key={key} className="flex items-start gap-4 cursor-pointer group p-4 border border-border hover:border-primary transition-colors">
                      <div className="relative flex items-center justify-center mt-1">
                        <input
                          type="checkbox"
                          className="peer appearance-none w-5 h-5 border border-border rounded-none checked:bg-primary checked:border-primary transition-colors"
                          checked={prefs[key]}
                          onChange={e => updateEmailPrefsMutation.mutate({ [key]: e.target.checked })}
                          disabled={updateEmailPrefsMutation.isPending}
                        />
                        <Check className="absolute w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
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
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
      ))}
    </div>
  );
}

function MyReviewsTab({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useGetMyReviews({
    query: { queryKey: getGetMyReviewsQueryKey() },
  });
  const updateMutation = useUpdateReview();
  const deleteMutation = useDeleteReview();

  const [editTarget, setEditTarget] = useState<{ id: number; productId: number; rating: number; title: string; comment: string } | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, title: "", comment: "" });
  const [hovered, setHovered] = useState(0);

  const invalidateReviews = (productId: number) => {
    qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
  };

  const openEdit = (r: { id: number; productId: number; rating: number; title?: string | null; comment?: string | null }) => {
    setEditTarget({ id: r.id, productId: r.productId, rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
    setEditForm({ rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data: { rating: editForm.rating, title: editForm.title || undefined, comment: editForm.comment || undefined } },
      {
        onSuccess: () => {
          toast({ title: t("dash.reviewUpdated") || "Review updated" });
          setEditTarget(null);
          invalidateReviews(editTarget.productId);
        },
      }
    );
  };

  const handleDelete = (id: number, productId: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("dash.reviewDeleted") || "Review deleted" });
        invalidateReviews(productId);
      },
    });
  };

  void userId;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-serif font-bold uppercase tracking-widest pb-4 border-b border-border">{t("dash.myReviews")}</h2>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="border border-border p-8 h-40 animate-pulse bg-muted/10" />)}
        </div>
      ) : !reviews?.length ? (
        <div className="bg-muted/10 p-16 text-center border border-border">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
          <p className="text-muted-foreground font-serif text-2xl mb-4">{t("dash.noReviews") || "You haven't written any reviews yet."}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("dash.noReviewsHint") || "Shop and review your purchases to see them here."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(reviews as Array<{ id: number; productId: number; rating: number; title?: string | null; comment?: string | null; verifiedPurchase: boolean; createdAt: string; productNameEn?: string | null }>).map(review => (
            <div key={review.id} className="border border-border p-8 bg-background">
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6 pb-6 border-b border-border">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Link href={`/products/${review.productId}`} className="font-serif text-xl font-bold hover:text-primary transition-colors">
                      {review.productNameEn ?? `Product #${review.productId}`}
                    </Link>
                    {review.verifiedPurchase && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1">
                        <CheckCircle2 className="w-3 h-3" /> {t("reviews.verifiedPurchase") || "Verified Purchase"}
                      </span>
                    )}
                  </div>
                  <StarDisplay value={review.rating} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{format(new Date(review.createdAt), "MMMM dd, yyyy")}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button variant="outline" className="flex-1 md:flex-none rounded-none uppercase tracking-widest text-[10px] font-bold h-10 border-border" onClick={() => openEdit(review)}>
                    <PenLine className="w-3.5 h-3.5 mr-2" /> {t("dash.addr.edit") || "Edit"}
                  </Button>
                  <Button variant="outline" className="flex-1 md:flex-none h-10 px-4 text-destructive border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors rounded-none"
                    onClick={() => handleDelete(review.id, review.productId)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {review.title && <p className="font-bold text-lg mb-3">{review.title}</p>}
              {review.comment && <p className="text-base text-muted-foreground leading-relaxed">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <h3 className="font-serif text-2xl font-bold">{t("dash.editReview") || "Edit Review"}</h3>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">{t("reviews.rating")}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button"
                      onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(0)}
                      onClick={() => setEditForm(f => ({ ...f, rating: i }))}>
                      <Star className={`w-8 h-8 transition-colors ${i <= (hovered || editForm.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">{t("reviews.titleLabel") || "Title"}</label>
                <input type="text" maxLength={120} value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full h-12 border border-border px-4 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">{t("reviews.commentLabel") || "Comment"}</label>
                <textarea rows={5} maxLength={2000} value={editForm.comment}
                  onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))}
                  className="w-full border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
              <div className="flex gap-4 pt-6 border-t border-border mt-8">
                <Button type="button" variant="outline" className="flex-1 rounded-none h-14 uppercase tracking-widest text-xs font-bold border-border" onClick={() => setEditTarget(null)}>{t("dash.cancel")}</Button>
                <Button type="submit" className="flex-1 rounded-none h-14 uppercase tracking-widest text-xs font-bold" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t("dash.saving") : (t("dash.updateReview") || "Update Review")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Support Tab ──────────────────────────────────────────────────────────────
type SupportTicket = { id: number; subject: string; category: string; status: string; priority: string; orderId?: number | null; closedAt?: string | null; createdAt: string; updatedAt: string };
type TicketMsg = { id: number; ticketId: number; senderId: number; message: string; createdAt: string; senderName?: string; senderRole?: string };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting_customer: "bg-purple-50 text-purple-700 border-purple-200",
  waiting_admin: "bg-orange-50 text-orange-700 border-orange-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground border-border",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open", in_progress: "In Progress", waiting_customer: "Waiting on You", waiting_admin: "Awaiting Reply", resolved: "Resolved", closed: "Closed",
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment History Tab
// ─────────────────────────────────────────────────────────────────────────────
interface PaymobEntry {
  id: number;
  orderId: number;
  amountCents: number;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
}
interface ManualEntry {
  id: number;
  orderId: number;
  method: string;
  status: string;
  referenceNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  orderTotal: string;
}

function PaymentHistoryTab() {
  const { t } = useTranslation();
  const [paymob, setPaymob] = useState<PaymobEntry[]>([]);
  const [manual, setManual] = useState<ManualEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ paymob: PaymobEntry[]; manual: ManualEntry[] }>("/api/payments/my");
        setPaymob(data.paymob ?? []);
        setManual(data.manual ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusColor = (s: string) =>
    s === "success" || s === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "failed" ? "bg-destructive/10 text-destructive border-destructive/20"
    : s === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-muted text-muted-foreground border-border";

  const methodLabel = (m: string) =>
    m === "vodafone_cash" ? "Vodafone Cash"
    : m === "etisalat_cash" ? "Etisalat Cash"
    : m === "instapay" ? "InstaPay"
    : m === "card" ? "Card"
    : m;

  const isEmpty = !loading && paymob.length === 0 && manual.length === 0;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-serif font-bold uppercase tracking-widest pb-4 border-b border-border">{t("dash.paymentHistory") || "Payment History"}</h2>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground font-bold uppercase tracking-widest">{t("dash.loading")}</div>
      ) : isEmpty ? (
        <div className="border border-border p-16 text-center bg-muted/10">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
          <h3 className="font-serif text-2xl font-bold mb-4">{t("dash.noPayments") || "No payment records found"}</h3>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("dash.noPaymentsDesc") || "Your payment history will appear here once you've made a purchase."}</p>
        </div>
      ) : (
        <div className="space-y-12">
          {paymob.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("dash.paymentType.paymob") || "Card (Paymob)"}</h3>
              <div className="border border-border bg-background overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      {["Order", "Method", "Amount", "Status", "Date"].map(h => (
                        <th key={h} className="px-6 py-4 text-left border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymob.map(p => (
                      <tr key={p.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-5 font-bold">#{p.orderId}</td>
                        <td className="px-6 py-5 text-muted-foreground capitalize">{methodLabel(p.method)}</td>
                        <td className="px-6 py-5 font-bold font-serif text-lg">{(p.amountCents / 100).toFixed(2)} <span className="text-xs font-sans">EGP</span></td>
                        <td className="px-6 py-5"><span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-none ${statusColor(p.status)}`}>{p.status}</span></td>
                        <td className="px-6 py-5 text-muted-foreground text-xs uppercase tracking-widest">{format(new Date(p.createdAt), "MMM dd, yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {manual.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("dash.paymentType.manual") || "Manual Transfer"}</h3>
              <div className="border border-border bg-background overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      {["Order", "Method", "Amount", "Reference", "Status", "Date"].map(h => (
                        <th key={h} className="px-6 py-4 text-left border-b border-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manual.map(m => (
                      <tr key={m.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-5 font-bold">#{m.orderId}</td>
                        <td className="px-6 py-5 text-muted-foreground capitalize">{methodLabel(m.method)}</td>
                        <td className="px-6 py-5 font-bold font-serif text-lg">{Number(m.orderTotal).toFixed(2)} <span className="text-xs font-sans">EGP</span></td>
                        <td className="px-6 py-5 text-muted-foreground text-xs font-mono tracking-wider">{m.referenceNumber ?? "—"}</td>
                        <td className="px-6 py-5"><span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-none ${statusColor(m.status)}`}>{m.status}</span></td>
                        <td className="px-6 py-5 text-muted-foreground text-xs uppercase tracking-widest">{format(new Date(m.createdAt), "MMM dd, yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      if (res.ok) {
        setReply("");
        const data = await res.json() as TicketMsg;
        setMessages(m => [...m, data]);
      } else throw new Error();
    } catch { toast({ title: t("dash.replyFailed") || "Failed to send reply", variant: "destructive" }); }
    finally { setReplyPending(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.subject.trim() || !newForm.message.trim()) { toast({ title: t("dash.subjectRequired") || "Subject and message are required", variant: "destructive" }); return; }
    setCreating(true);
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newForm.subject, category: newForm.category, message: newForm.message, orderId: newForm.orderId ? Number(newForm.orderId) : undefined }),
      });
      if (res.ok) {
        toast({ title: t("dash.ticketOpened") || "Ticket opened successfully" });
        setShowNew(false);
        setNewForm({ subject: "", category: "general", message: "", orderId: "" });
        void load();
      } else throw new Error();
    } catch { toast({ title: t("dash.ticketFailed") || "Failed to open ticket", variant: "destructive" }); }
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
      if (res.ok) {
        toast({ title: "Ticket closed" });
        setSelected(prev => prev ? { ...prev, status: "closed" } : null);
        void load();
      }
    } finally { setClosing(false); }
  };

  if (loading) return <div className="p-16 text-center text-muted-foreground font-bold uppercase tracking-widest">{t("dash.loading")}</div>;

  if (showNew) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <Button variant="ghost" className="rounded-none px-4 h-10 uppercase tracking-widest text-[10px] font-bold" onClick={() => setShowNew(false)}>← {t("dash.back")}</Button>
          <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">{t("dash.openTicketForm") || "Open Support Ticket"}</h2>
        </div>
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">{t("dash.ticketCategory") || "Category"}</label>
              <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-14 rounded-none border-border focus:ring-primary uppercase tracking-widest text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  <SelectItem value="general" className="uppercase tracking-widest text-xs font-bold">General Inquiry</SelectItem>
                  <SelectItem value="order" className="uppercase tracking-widest text-xs font-bold">Order Issue</SelectItem>
                  <SelectItem value="payment" className="uppercase tracking-widest text-xs font-bold">Payment Issue</SelectItem>
                  <SelectItem value="returns" className="uppercase tracking-widest text-xs font-bold">Returns & Refunds</SelectItem>
                  <SelectItem value="account" className="uppercase tracking-widest text-xs font-bold">Account Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newForm.category === "order" && myOrders && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Related Order (Optional)</label>
                <Select value={newForm.orderId} onValueChange={v => setNewForm(f => ({ ...f, orderId: v }))}>
                  <SelectTrigger className="h-14 rounded-none border-border focus:ring-primary uppercase tracking-widest text-xs font-bold">
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-border">
                    <SelectItem value="none" className="uppercase tracking-widest text-xs font-bold">None</SelectItem>
                    {myOrders.map(o => (
                      <SelectItem key={o.id} value={String(o.id)} className="uppercase tracking-widest text-xs font-bold">
                        Order #{o.id} - {format(new Date(o.createdAt), "MMM d, yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">{t("dash.ticketSubject") || "Subject"} *</label>
            <Input className="h-14 rounded-none border-border focus-visible:ring-primary focus-visible:border-primary text-sm font-medium" value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} placeholder={t("dash.ticketSubjectPlaceholder") || "Briefly describe your issue..."} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">{t("dash.ticketMessage") || "Message"} *</label>
            <textarea rows={6} value={newForm.message} onChange={e => setNewForm(f => ({ ...f, message: e.target.value }))} className="w-full border border-border px-4 py-4 text-sm font-medium bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50" placeholder={t("dash.ticketMessagePlaceholder") || "Describe your issue in detail..."} />
          </div>
          <Button type="submit" className="w-full h-14 rounded-none uppercase tracking-widest text-sm font-bold mt-4" disabled={creating}>{creating ? (t("dash.opening") || "Opening...") : (t("dash.openTicketBtn") || "Open Ticket")}</Button>
        </form>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="rounded-none px-4 h-10 uppercase tracking-widest text-[10px] font-bold shrink-0" onClick={() => setSelected(null)}>← {t("dash.back")}</Button>
            <div>
              <h2 className="text-xl font-serif font-bold">{selected.subject}</h2>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                <span>Ticket #{selected.id}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 border ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status] || selected.status}</span>
                {selected.orderId && <><span>·</span><Link href={`/track-order/${selected.orderId}`} className="text-primary hover:underline">Order #{selected.orderId}</Link></>}
              </div>
            </div>
          </div>
          {selected.status !== "closed" && (
            <Button variant="outline" size="sm" onClick={handleCloseTicket} disabled={closing} className="rounded-none uppercase tracking-widest text-[10px] font-bold border-border">
              Close Ticket
            </Button>
          )}
        </div>

        <div className="space-y-6 max-w-3xl border border-border p-6 bg-muted/5">
          {messages.map((m, i) => {
            const isMe = m.senderRole === "customer" || m.senderName === "Me";
            return (
              <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                  {isMe ? "You" : m.senderName || "Support Team"} · {format(new Date(m.createdAt), "MMM d, h:mm a")}
                </div>
                <div className={`p-5 max-w-[85%] border ${isMe ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border shadow-sm"}`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selected.status !== "closed" && (
          <form onSubmit={handleReply} className="flex gap-4 max-w-3xl items-end mt-8">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Reply</label>
              <textarea rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder={t("dash.replyPlaceholder") || "Type your reply..."} className="w-full border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50 font-medium" />
            </div>
            <Button type="submit" className="rounded-none h-14 uppercase tracking-widest text-xs font-bold px-8" disabled={replyPending || !reply.trim()}>
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h2 className="text-2xl font-serif font-bold uppercase tracking-widest">{t("dash.supportTitle") || "Support"}</h2>
        <Button className="rounded-none uppercase tracking-widest text-xs font-bold h-10 px-6" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t("dash.newTicket") || "New Ticket"}
        </Button>
      </div>

      {!tickets.length ? (
        <div className="bg-muted/10 p-16 text-center border border-border">
          <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-30" />
          <p className="text-muted-foreground font-serif text-2xl mb-4">{t("dash.noTickets") || "No support tickets yet"}</p>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-8">{t("dash.noTicketsDesc") || "Open a ticket if you need help with an order, payment, or anything else."}</p>
          <Button variant="outline" className="rounded-none uppercase tracking-widest text-xs font-bold h-12 px-8 border-border" onClick={() => setShowNew(true)}>
            {t("dash.openFirstTicket") || "Open Your First Ticket"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-4xl">
          {tickets.map(tkt => (
            <div key={tkt.id} className="border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-foreground transition-colors cursor-pointer bg-background" onClick={() => openTicket(tkt)}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded-none ${STATUS_COLORS[tkt.status]}`}>
                    {STATUS_LABELS[tkt.status] || tkt.status}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ticket #{tkt.id}</span>
                  {tkt.orderId && <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Order #{tkt.orderId}</span>}
                </div>
                <h3 className="font-serif text-xl font-bold">{tkt.subject}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                  {t("dash.opened") || "Opened"} {format(new Date(tkt.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Button variant="ghost" className="shrink-0 rounded-none uppercase tracking-widest text-[10px] font-bold self-start md:self-center">
                View Ticket <ChevronRight className="w-3 h-3 ml-2" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}