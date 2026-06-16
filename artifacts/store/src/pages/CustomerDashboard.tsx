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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetMyReviews, useUpdateReview, useDeleteReview, getGetMyReviewsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";
import { useSEO } from "@/hooks/useSEO";
import {
  MapPin, Plus, Pencil, Trash2, Star, Package, ShoppingBag,
  Heart, Bell, Shield, Settings, LayoutDashboard, RefreshCw,
  TrendingUp, Clock, Check, PenLine, CheckCircle2, X, FileDown, Headphones, Send, MessageCircle, CreditCard,
} from "lucide-react";

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
      ? <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{t("dash.codPaid")}</span>
      : <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">{t("dash.payOnDelivery")}</span>;
  }
  if (paymentStatus === "paid") return <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{t("dash.paid")}</span>;
  if (paymentStatus === "failed") return <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{t("dash.paymentFailed")}</span>;
  return <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">{t("dash.paymentPending")}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    new: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
    processing: "bg-yellow-50 text-yellow-700",
    packed: "bg-teal-50 text-teal-700",
    shipped: "bg-purple-50 text-purple-700",
    out_for_delivery: "bg-orange-50 text-orange-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wide rounded-full ${COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function AddressCard({ addr, onEdit, onDelete, onSetDefault, isLoading }: {
  addr: UserAddress; onEdit: () => void; onDelete: () => void; onSetDefault: () => void; isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`border p-5 relative ${addr.isDefault ? "border-primary" : "border-border"}`}>
      {addr.isDefault && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-primary">
          <Star className="w-3 h-3 fill-primary" /> {t("dash.addr.default")}
        </span>
      )}
      <div className="flex items-start gap-3 mb-3">
        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{addr.label}</p>
          <p className="text-sm text-muted-foreground">{addr.firstName} {addr.lastName}</p>
          <p className="text-sm text-muted-foreground">{addr.address}, {addr.city}</p>
          <p className="text-sm text-muted-foreground">{addr.phone}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {!addr.isDefault && (
          <button onClick={onSetDefault} disabled={isLoading} className="text-xs text-primary hover:underline disabled:opacity-50">
            {t("dash.addr.setAsDefault")}
          </button>
        )}
        <button onClick={onEdit} disabled={isLoading} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 ml-auto">
          <Pencil className="w-3 h-3" /> {t("dash.addr.edit")}
        </button>
        <button onClick={onDelete} disabled={isLoading} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
          <Trash2 className="w-3 h-3" /> {t("dash.addr.delete")}
        </button>
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
    <div className="border border-border p-5 space-y-4 bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.label")}</label>
          <Input value={form.label} onChange={e => set("label", e.target.value)} placeholder={t("dash.addr.labelPlaceholder")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.firstName")}</label>
          <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.lastName")}</label>
          <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.address")}</label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Fashion St" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.city")}</label>
          <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cairo" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.addr.phone")}</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+20 100 000 0000" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="w-4 h-4" />
        {t("dash.addr.setDefault")}
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={isSaving || !form.firstName || !form.lastName || !form.address || !form.city || !form.phone}>
          {isSaving ? t("dash.addr.saving") : t("dash.addr.save")}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>{t("dash.cancel")}</Button>
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

  type RecentProduct = { productId: number; nameEn: string | null; slug: string | null; imageUrl: string | null; price: string | null };
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
    onSuccess: () => { refetchAddresses(); setShowAddressForm(false); toast({ title: t("dash.addr.saved") }); },
    onError: (e) => toast({ title: t("dash.addr.saveFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AddressFormData> }) =>
      apiFetch<UserAddress>(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { refetchAddresses(); setEditingAddress(null); toast({ title: t("dash.addr.updated") }); },
    onError: (e) => toast({ title: t("dash.addr.updateFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetchAddresses(); toast({ title: t("dash.addr.deleted") }); },
  });
  const updateEmailPrefsMutation = useMutation({
    mutationFn: (data: Partial<{ orderUpdates: boolean; promotions: boolean; securityAlerts: boolean }>) =>
      apiFetch(`/api/users/${user!.id}/email-preferences`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { refetchEmailPrefs(); toast({ title: t("dash.emailPrefsSaved") }); },
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
    removeFromWishlistMutation.mutate({ productId }, { onSuccess: () => { toast({ title: t("dash.removedWishlist") }); refetchWishlist(); } });
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, { onSuccess: () => refetchNotifications() });
  };

  const handleReorder = (order: { items?: Array<{ productVariantId: number; quantity: number; price: number }> }) => {
    if (!order.items?.length) return;
    const items = order.items.map(i => ({ productVariantId: i.productVariantId, quantity: i.quantity }));
    createOrderMutation.mutate(
      { data: { items, paymentMethod: "cash_on_delivery" } },
      {
        onSuccess: (newOrder) => {
          toast({ title: t("dash.orderPlacedTitle"), description: t("dash.orderPlacedDesc").replace("{id}", String(newOrder.id)) });
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ userId: user.id }) });
          setLocation(`/track-order/${newOrder.id}`);
        },
        onError: (e) => toast({ title: t("dash.reorderFailed"), description: (e as Error).message, variant: "destructive" }),
      }
    );
  };

  const tabStyle = "justify-start px-4 py-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-l-2 border-transparent data-[state=active]:border-primary text-sm font-medium gap-2";

  const NAV_TABS = [
    { value: "overview", label: t("dash.tab.overview"), icon: LayoutDashboard },
    { value: "orders", label: t("dash.tab.orders"), icon: ShoppingBag },
    { value: "tracking", label: t("dash.tab.tracking"), icon: Package },
    { value: "addresses", label: t("dash.tab.addresses"), icon: MapPin },
    { value: "wishlist", label: t("dash.tab.wishlist"), icon: Heart },
    { value: "my-reviews", label: t("dash.tab.myReviews"), icon: Star },
    { value: "support", label: t("dash.tab.support"), icon: Shield },
    { value: "notifications", label: t("dash.tab.notifications"), icon: Bell, badge: unreadCount },
    { value: "payment-history", label: t("dash.tab.paymentHistory"), icon: CreditCard },
    { value: "security", label: t("dash.tab.security"), icon: Shield },
    { value: "profile", label: t("dash.tab.profile"), icon: Settings },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-1">{t("dash.myAccount")}</h1>
        <p className="text-muted-foreground text-sm">{t("dash.welcomeBack")}, {user.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8">
        {/* Sidebar nav */}
        <TabsList className="flex flex-col w-full md:w-60 h-auto bg-transparent items-stretch space-y-1 p-0 shrink-0">
          {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
            <TabsTrigger key={value} value={value} className={tabStyle}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge ? (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-w-0">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="m-0 space-y-8">
            <h2 className="text-2xl font-serif font-bold">{t("dash.overview")}</h2>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t("dash.totalOrders"), value: allOrders.length, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
                { label: t("dash.activeOrders"), value: activeOrders.length, icon: Clock, color: "text-orange-600 bg-orange-50" },
                { label: t("dash.wishlistItems"), value: wishlist?.length ?? 0, icon: Heart, color: "text-pink-600 bg-pink-50" },
                { label: t("dash.rewardPoints"), value: "—", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="border border-border p-4 space-y-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{t("dash.recentOrders")}</h3>
                <button onClick={() => setActiveTab("orders")} className="text-xs text-primary hover:underline">
                  {t("dash.viewAll")}
                </button>
              </div>
              {!allOrders.length ? (
                <div className="border border-border p-8 text-center">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">{t("dash.noOrders")}</p>
                  <Button size="sm" variant="outline" asChild><Link href="/products">{t("dash.startShopping")}</Link></Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {allOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="border border-border px-5 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm">Order #{order.id}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM dd, yyyy")} · {Number(order.totalPrice).toLocaleString()} EGP
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/track-order/${order.id}`}>{t("dash.trackBtn")}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Viewed */}
            {recentlyViewed && recentlyViewed.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Recently Viewed</h3>
                  <Link href="/products" className="text-xs text-primary hover:underline">Browse All</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recentlyViewed.map(p => (
                    <Link key={p.productId} href={`/products/${p.slug ?? p.productId}`} className="group border border-border overflow-hidden hover:border-primary transition-colors">
                      <div className="aspect-square bg-muted overflow-hidden">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.nameEn ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>
                        }
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{p.nameEn}</p>
                        {p.price && <p className="text-xs text-muted-foreground">{Number(p.price).toLocaleString()} EGP</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Active order tracking */}
            {activeOrders.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{t("dash.activeShipments")}</h3>
                  <button onClick={() => setActiveTab("tracking")} className="text-xs text-primary hover:underline">
                    {t("dash.viewAll")}
                  </button>
                </div>
                <div className="space-y-3">
                  {activeOrders.slice(0, 2).map(order => {
                    const stepIdx = STATUS_STEPS.indexOf(order.status);
                    const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                    return (
                      <div key={order.id} className="border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/track-order/${order.id}`}>{t("dash.trackProgress")}</Link>
                          </Button>
                        </div>
                        <div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{order.status.replace(/_/g, " ")} — {progress}{t("dash.complete")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── MY ORDERS ────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="m-0 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-serif font-bold">{t("dash.myOrders")}</h2>
              <p className="text-sm text-muted-foreground">{allOrders.length} {allOrders.length !== 1 ? t("dash.items") : t("dash.item")} {t("dash.ordersTotal")}</p>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder={t("dash.searchOrders")}
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder={t("dash.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("dash.allStatuses")}</SelectItem>
                  {["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!filteredOrders.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  {allOrders.length === 0 ? t("dash.noOrdersYet") : t("dash.noOrdersMatch")}
                </p>
                {allOrders.length === 0 && (
                  <Button variant="outline" asChild><Link href="/products">{t("dash.startShopping")}</Link></Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <div key={order.id} className="border border-border p-5">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="font-bold">Order #{order.id}</span>
                          <StatusBadge status={order.status} />
                          <PaymentStatusBadge
                            paymentStatus={(order as unknown as { paymentStatus?: string }).paymentStatus}
                            orderStatus={order.status}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mb-0.5">
                          {t("dash.placed")} {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.items?.length || 0} {(order.items?.length || 0) !== 1 ? t("dash.items") : t("dash.item")} · {order.paymentMethod.replace(/_/g, " ")}
                        </p>

                        {/* Item thumbnails */}
                        {order.items && order.items.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {(order.items as unknown as Array<{ productVariantId: number; imageUrl?: string | null; nameEn?: string }>).slice(0, 4).map((item, i) => (
                              <div key={i} className="w-10 h-10 bg-muted overflow-hidden">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {(order.items?.length || 0) > 4 && (
                              <div className="w-10 h-10 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                +{(order.items?.length || 0) - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 md:flex-col md:items-end shrink-0">
                        <p className="text-xl font-bold">{Number(order.totalPrice).toLocaleString()} EGP</p>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/track-order/${order.id}`}>{t("dash.trackBtn")}</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => { setSupportOrderId(order.id); setActiveTab("support"); }}
                          >
                            <Headphones className="w-3 h-3" />
                            Support
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
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
                            <FileDown className="w-3 h-3" />
                            {t("dash.invoice")}
                          </Button>
                          {["delivered", "cancelled"].includes(order.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={createOrderMutation.isPending}
                              onClick={() => handleReorder(order as { items?: Array<{ productVariantId: number; quantity: number; price: number }> })}
                              className="gap-1.5"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {t("dash.reorder")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TRACK ORDERS ─────────────────────────────────────────────── */}
          <TabsContent value="tracking" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold">{t("dash.trackOrders")}</h2>
            {!activeOrders.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <Check className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">{t("dash.noActiveOrders")}</p>
                <Button variant="outline" asChild><Link href="/products">{t("dash.shopAgain")}</Link></Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => {
                  const stepIdx = STATUS_STEPS.indexOf(order.status);
                  const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                  return (
                    <div key={order.id} className="border border-border p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">Order #{order.id}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/track-order/${order.id}`}>{t("dash.fullDetails")}</Link>
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t("dash.orderPlacedLabel")}</span>
                          <span>{progress}%</span>
                          <span>{t("dash.deliveredLabel")}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.status.replace(/_/g, " ")} · {order.items?.length || 0} {(order.items?.length || 0) !== 1 ? t("dash.items") : t("dash.item")} · {Number(order.totalPrice).toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── ADDRESSES ────────────────────────────────────────────────── */}
          <TabsContent value="addresses" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">{t("dash.savedAddresses")}</h2>
              {!showAddressForm && !editingAddress && (
                <Button size="sm" variant="outline" onClick={() => setShowAddressForm(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> {t("dash.addAddress")}
                </Button>
              )}
            </div>
            {showAddressForm && (
              <AddressForm initial={EMPTY_ADDRESS} onSave={(d) => createAddressMutation.mutate(d)} onCancel={() => setShowAddressForm(false)} isSaving={createAddressMutation.isPending} />
            )}
            {!addresses?.length && !showAddressForm ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">{t("dash.noAddresses")}</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddressForm(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> {t("dash.addFirstAddress")}
                </Button>
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
          </TabsContent>

          {/* ── WISHLIST ──────────────────────────────────────────────────── */}
          <TabsContent value="wishlist" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">{t("dash.myWishlist")}</h2>
              {wishlist?.length ? <p className="text-sm text-muted-foreground">{wishlist.length} {wishlist.length !== 1 ? t("dash.items") : t("dash.item")}</p> : null}
            </div>
            {!wishlist?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">{t("dash.wishlistEmpty")}</p>
                <Button variant="outline" asChild><Link href="/products">{t("dash.discoverProducts")}</Link></Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {wishlist.map(item => (
                  <div key={item.productId} className="group border border-border flex flex-col overflow-hidden">
                    <Link href={`/products/${item.productId}`} className="block aspect-[3/4] bg-muted relative overflow-hidden">
                      {item.product.images?.[0] && (
                        <img src={item.product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                    </Link>
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <h3 className="font-medium text-sm mb-1 line-clamp-2">
                          {language === "en" ? item.product.nameEn : item.product.nameAr}
                        </h3>
                        <p className="font-bold text-sm">{Number(item.product.price).toLocaleString()} EGP</p>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link href={`/products/${item.productId}`}>{t("dash.view")}</Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemoveWishlist(item.productId)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── MY REVIEWS ────────────────────────────────────────────────── */}
          <TabsContent value="my-reviews" className="m-0 space-y-6">
            <MyReviewsTab userId={user.id} />
          </TabsContent>

          {/* ── SUPPORT ───────────────────────────────────────────────────── */}
          <TabsContent value="support" className="m-0 space-y-6">
            <SupportTab userId={user.id} prefilledOrderId={supportOrderId} />
          </TabsContent>

          {/* ── NOTIFICATIONS ─────────────────────────────────────────────── */}
          <TabsContent value="notifications" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">{t("dash.notifications")}</h2>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">{unreadCount} {t("dash.unread")}</span>
              )}
            </div>
            {!notifications?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("dash.noNotifications")}</p>
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
                <div className="space-y-6">
                  {sections.map((section, si) => (
                    <div key={si}>
                      {section.label && (
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 border-b border-border pb-1">{section.label}</p>
                      )}
                      <div className="space-y-2">
                        {section.items.map(notif => (
                          <div key={notif.id} className={`p-4 border ${notif.isRead ? "border-border" : "border-primary/40 bg-primary/5"} flex justify-between items-start gap-4`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                <h4 className={`font-semibold text-sm ${notif.isRead ? "text-muted-foreground" : "text-foreground"}`}>{notif.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">{format(new Date(notif.createdAt), "MMM dd, yyyy HH:mm")}</p>
                            </div>
                            {!notif.isRead && (
                              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleMarkRead(notif.id)}>
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
          </TabsContent>

          {/* ── PAYMENT HISTORY ───────────────────────────────────────────── */}
          <TabsContent value="payment-history" className="m-0 space-y-6">
            <PaymentHistoryTab />
            {/* Saved Coupons */}
            <div className="border-t border-border pt-6">
              <h3 className="font-semibold mb-4 text-lg">Saved Coupons</h3>
              {!savedCoupons?.length ? (
                <p className="text-sm text-muted-foreground">No saved coupons yet. Coupons you save will appear here.</p>
              ) : (
                <div className="space-y-2">
                  {savedCoupons.map(c => (
                    <div key={c.id} className="border border-border p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-sm">{c.couponCode}</span>
                          {c.active === false && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Inactive</span>}
                          {c.endDate && new Date(c.endDate) < new Date() && <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Expired</span>}
                        </div>
                        {c.discountType && c.discountValue && (
                          <p className="text-xs text-muted-foreground">
                            {c.discountType === "percentage" ? `${c.discountValue}% off` : `${Number(c.discountValue).toLocaleString()} EGP off`}
                            {c.endDate && ` · Expires ${format(new Date(c.endDate), "MMM d, yyyy")}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => apiFetch(`/api/saved-coupons/${c.couponCode}`, { method: "DELETE" }).then(() => refetchSavedCoupons())}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── SECURITY ──────────────────────────────────────────────────── */}
          <TabsContent value="security" className="m-0">
            <SecurityCenterTab showAlert={alertParam === "1"} />
          </TabsContent>

          {/* ── PROFILE / ACCOUNT SETTINGS ────────────────────────────────── */}
          <TabsContent value="profile" className="m-0 space-y-10 max-w-md">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold">{t("dash.accountSettings")}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("dash.fullName")}</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("dash.emailAddress")}</label>
                  <Input value={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">{t("dash.emailNote")}</p>
                </div>
                <Button onClick={handleUpdateProfile} disabled={updateUserMutation.isPending || name === user.name}>
                  {updateUserMutation.isPending ? t("dash.saving") : t("dash.saveChanges")}
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{t("dash.emailNotifications")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("dash.emailNotificationsDesc")}</p>
              </div>
              <div className="space-y-4">
                {([
                  { key: "orderUpdates" as const, label: t("dash.emailPref.orderUpdates"), desc: t("dash.emailPref.orderUpdatesDesc") },
                  { key: "promotions" as const, label: t("dash.emailPref.promotions"), desc: t("dash.emailPref.promotionsDesc") },
                  { key: "securityAlerts" as const, label: t("dash.emailPref.securityAlerts"), desc: t("dash.emailPref.securityAlertsDesc") },
                ] as const).map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-0.5"
                      checked={prefs[key]}
                      onChange={e => updateEmailPrefsMutation.mutate({ [key]: e.target.checked })}
                      disabled={updateEmailPrefsMutation.isPending}
                    />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
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

  const [editTarget, setEditTarget] = useState<{ id: number; rating: number; title: string; comment: string } | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, title: "", comment: "" });
  const [hovered, setHovered] = useState(0);

  const openEdit = (r: { id: number; rating: number; title?: string | null; comment?: string | null }) => {
    setEditTarget({ id: r.id, rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
    setEditForm({ rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data: { rating: editForm.rating, title: editForm.title || undefined, comment: editForm.comment || undefined } },
      {
        onSuccess: () => {
          toast({ title: t("dash.reviewUpdated") });
          setEditTarget(null);
          qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("dash.reviewDeleted") });
        qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
      },
    });
  };

  void userId;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold">{t("dash.myReviews")}</h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="border border-border p-5 h-28 animate-pulse bg-muted/30" />)}
        </div>
      ) : !reviews?.length ? (
        <div className="bg-muted/30 p-8 text-center border border-border">
          <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">{t("dash.noReviews")}</p>
          <p className="text-xs text-muted-foreground">{t("dash.noReviewsHint")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(reviews as Array<{ id: number; productId: number; rating: number; title?: string | null; comment?: string | null; verifiedPurchase: boolean; createdAt: string; productNameEn?: string | null }>).map(review => (
            <div key={review.id} className="border border-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/products/${review.productId}`} className="font-semibold text-sm hover:underline">
                      {review.productNameEn ?? `Product #${review.productId}`}
                    </Link>
                    {review.verifiedPurchase && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {t("reviews.verifiedPurchase")}
                      </span>
                    )}
                  </div>
                  <StarDisplay value={review.rating} />
                  <p className="text-xs text-muted-foreground">{format(new Date(review.createdAt), "MMM dd, yyyy")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-none h-8 px-3" onClick={() => openEdit(review)}>
                    <PenLine className="w-3.5 h-3.5 mr-1" /> {t("dash.addr.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 px-3 text-destructive hover:text-destructive rounded-none"
                    onClick={() => handleDelete(review.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {review.title && <p className="font-medium text-sm">{review.title}</p>}
              {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-serif text-lg font-bold">{t("dash.editReview")}</h3>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.rating")}</label>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} type="button"
                      onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(0)}
                      onClick={() => setEditForm(f => ({ ...f, rating: i }))}>
                      <Star className={`w-6 h-6 transition-colors ${i <= (hovered || editForm.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.title")}</label>
                <input type="text" maxLength={120} value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.comment")}</label>
                <textarea rows={4} maxLength={2000} value={editForm.comment}
                  onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))}
                  className="w-full border border-border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => setEditTarget(null)}>{t("dash.cancel")}</Button>
                <Button type="submit" className="flex-1 rounded-none" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t("dash.saving") : t("dash.updateReview")}
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
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_customer: "bg-purple-100 text-purple-700",
  waiting_admin: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-muted text-muted-foreground",
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
    s === "success" || s === "approved" ? "bg-green-100 text-green-700"
    : s === "failed" ? "bg-red-100 text-red-700"
    : s === "pending" ? "bg-yellow-100 text-yellow-700"
    : "bg-muted text-muted-foreground";

  const methodLabel = (m: string) =>
    m === "vodafone_cash" ? "Vodafone Cash"
    : m === "etisalat_cash" ? "Etisalat Cash"
    : m === "instapay" ? "InstaPay"
    : m === "card" ? "Card"
    : m;

  const isEmpty = !loading && paymob.length === 0 && manual.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold">{t("dash.paymentHistory")}</h2>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">{t("dash.loading")}</div>
      ) : isEmpty ? (
        <div className="border border-border p-12 text-center">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">{t("dash.noPayments")}</h3>
          <p className="text-muted-foreground text-sm">{t("dash.noPaymentsDesc")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymob.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t("dash.paymentType.paymob")}</h3>
              <div className="border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      {["Order", "Method", "Amount", "Status", "Date"].map(h => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymob.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium">#{p.orderId}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{methodLabel(p.method)}</td>
                        <td className="px-4 py-3 font-medium">{(p.amountCents / 100).toFixed(2)} {p.currency}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs capitalize rounded ${statusColor(p.status)}`}>{p.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(p.createdAt), "MMM d, yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {manual.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t("dash.paymentType.manual")}</h3>
              <div className="border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      {["Order", "Method", "Amount", "Reference", "Status", "Date"].map(h => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manual.map(m => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium">#{m.orderId}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{methodLabel(m.method)}</td>
                        <td className="px-4 py-3 font-medium">{Number(m.orderTotal).toFixed(2)} EGP</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{m.referenceNumber ?? "—"}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs capitalize rounded ${statusColor(m.status)}`}>{m.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(m.createdAt), "MMM d, yyyy")}</td>
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
      if (res.ok) setTickets(await res.json() as SupportTicket[]);
    } finally { setLoading(false); }
  };

  const loadTicket = async (t: SupportTicket) => {
    const token = localStorage.getItem("auth_token");
    setSelected(t);
    const res = await fetch(`${BASE}/api/support/tickets/${t.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json() as { ticket: SupportTicket; messages: TicketMsg[] };
      setMessages(data.messages);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const token = localStorage.getItem("auth_token");
    setReplyPending(true);
    try {
      const res = await fetch(`${BASE}/api/support/tickets/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      await loadTicket(selected);
    } catch {
      toast({ title: t("dash.replyFailed"), variant: "destructive" });
    } finally { setReplyPending(false); }
  };

  const createTicket = async () => {
    if (!newForm.subject || !newForm.message) {
      toast({ title: t("dash.ticketRequired"), variant: "destructive" }); return;
    }
    const token = localStorage.getItem("auth_token");
    setCreating(true);
    try {
      const body: Record<string, string | number> = { subject: newForm.subject, category: newForm.category, message: newForm.message };
      if (newForm.orderId) body.orderId = Number(newForm.orderId);
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast({ title: t("dash.ticketOpened") });
      setShowNew(false); setNewForm({ subject: "", category: "general", message: "", orderId: "" });
      await load();
    } catch {
      toast({ title: t("dash.ticketFailed"), variant: "destructive" });
    } finally { setCreating(false); }
  };

  const closeTicket = async () => {
    if (!selected) return;
    setClosing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/support/tickets/${selected.id}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: "Ticket closed" });
      await loadTicket({ ...selected, status: "closed" });
      await load();
    } catch {
      toast({ title: "Failed to close ticket", variant: "destructive" });
    } finally { setClosing(false); }
  };

  useEffect(() => { void load(); }, []);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelected(null); setMessages([]); void load(); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            ← {t("dash.back")}
          </button>
          <span className="text-xs text-muted-foreground">Ticket #{selected.id}</span>
            <span className={`px-2 py-0.5 text-xs capitalize rounded ${STATUS_COLORS[selected.status] ?? ""}`}>{STATUS_LABELS[selected.status] ?? selected.status}</span>
          {selected.status !== "closed" && (
            <button onClick={closeTicket} disabled={closing} className="ml-auto text-xs text-muted-foreground border border-border px-2 py-1 hover:bg-muted disabled:opacity-50">
              {closing ? "Closing…" : "Close Ticket"}
            </button>
          )}
        </div>
        <div className="border border-border p-4">
          <h3 className="font-bold">{selected.subject}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("dash.ticketOpened2")} {format(new Date(selected.createdAt), "MMM d, yyyy")}</p>
          {selected.orderId && (
            <p className="text-xs text-muted-foreground mt-0.5">Linked Order: <Link href={`/order/${selected.orderId}/tracking`} className="text-primary hover:underline">#{selected.orderId}</Link></p>
          )}
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.senderRole === "admin" ? "" : "flex-row-reverse"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.senderRole === "admin" ? "S" : "Me"}
              </div>
              <div className={`max-w-[80%] p-3 text-sm ${msg.senderRole === "admin" ? "bg-muted" : "bg-primary/10"}`}>
                <p className="leading-relaxed">{msg.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.createdAt), "MMM d, HH:mm")}</p>
              </div>
            </div>
          ))}
        </div>
        {selected.status !== "closed" && (
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={t("dash.replyPlaceholder")}
              rows={3}
              className="flex-1 border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={sendReply}
              disabled={replyPending || !reply.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold">{t("dash.support")}</h2>
        <button onClick={() => setShowNew(!showNew)} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          + {t("dash.newTicket")}
        </button>
      </div>

      {showNew && (
        <div className="border border-border p-5 bg-card space-y-3">
          <h3 className="font-bold text-sm">{t("dash.openTicket")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">{t("dash.ticketCategory")}</label>
              <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-input bg-background px-3 py-2 text-sm">
                {["general", "order", "payment", "shipping", "returns", "account", "other"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t("dash.ticketSubject")}</label>
              <input value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} placeholder={t("dash.ticketSubjectPlaceholder")} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none" />
            </div>
            {myOrders && myOrders.length > 0 && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium block mb-1">Link to an Order (optional)</label>
                <select value={newForm.orderId} onChange={e => setNewForm(f => ({ ...f, orderId: e.target.value }))} className="w-full border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— No specific order —</option>
                  {myOrders.map(o => <option key={o.id} value={o.id}>Order #{o.id} — {format(new Date(o.createdAt), "MMM d, yyyy")}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("dash.ticketMessage")}</label>
            <textarea value={newForm.message} onChange={e => setNewForm(f => ({ ...f, message: e.target.value }))} placeholder={t("dash.ticketMessagePlaceholder")} rows={4} className="w-full border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={createTicket} disabled={creating} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {creating ? t("dash.opening") : t("dash.openTicketBtn")}
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-border text-sm hover:bg-muted">{t("dash.cancel")}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">{t("dash.loading")}</div>
      ) : !tickets.length ? (
        <div className="border border-border p-12 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">{t("dash.noTickets")}</h3>
          <p className="text-muted-foreground text-sm mb-4">{t("dash.noTicketsDesc")}</p>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            {t("dash.openFirstTicket")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => loadTicket(t)} className="w-full text-left border border-border p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">#{t.id}</span>
                    <span className={`px-2 py-0.5 text-xs capitalize rounded ${STATUS_COLORS[t.status] ?? ""}`}>{STATUS_LABELS[t.status] ?? t.status}</span>
                    <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
                  </div>
                  <p className="text-sm truncate">{t.subject}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{format(new Date(t.updatedAt), "MMM d")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
