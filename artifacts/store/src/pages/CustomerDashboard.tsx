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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";
import { useSEO } from "@/hooks/useSEO";
import {
  MapPin, Pencil, Trash2, Star, ShoppingBag,
  Heart, Bell, Shield, Settings, LayoutDashboard,
  Check, ChevronRight, MessageCircle, CreditCard
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

type UserAddress = { id: number; label: string; firstName: string; lastName: string; address: string; city: string; phone: string; isDefault: boolean; };
type AddressFormData = Omit<UserAddress, "id" | "isDefault"> & { isDefault: boolean };
const EMPTY_ADDRESS: AddressFormData = { label: "Home", firstName: "", lastName: "", address: "", city: "Cairo", phone: "", isDefault: false };
const STATUS_STEPS = ["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

function StatusBadge({ status }: { status: string }) {
  const isPositive = ["paid", "delivered"].includes(status);
  const isWarning = ["processing", "packed", "shipped", "out_for_delivery"].includes(status);
  const isCancelled = status === "cancelled";
  
  return (
    <span className={`velora-label px-3 py-1.5 border ${
      isPositive ? "text-[#C9A227] border-[#C9A227]/30 bg-[#C9A227]/5" :
      isCancelled ? "text-destructive border-destructive/30 bg-destructive/5" :
      isWarning ? "text-foreground border-border bg-secondary" :
      "text-muted-foreground border-border bg-secondary"
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
    <div className={`border p-8 relative transition-colors ${addr.isDefault ? "border-foreground" : "border-border hover:border-foreground/30"}`}>
      {addr.isDefault && (
        <span className="absolute top-8 right-8 velora-label text-[#C9A227] flex items-center gap-2">
          <Star className="w-3 h-3 fill-current" /> {t("dash.addr.default")}
        </span>
      )}
      <div className="mb-8">
        <p className="font-serif text-xl font-bold mb-4">{addr.label}</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{addr.firstName} {addr.lastName}</p>
          <p>{addr.address}</p>
          <p>{addr.city}</p>
          <p className="pt-2">{addr.phone}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border">
        {!addr.isDefault ? (
          <button onClick={onSetDefault} disabled={isLoading} className="velora-link text-muted-foreground hover:text-[#C9A227] disabled:opacity-50">
            {t("dash.addr.setAsDefault")}
          </button>
        ) : <span />}
        <div className="flex gap-6">
          <button onClick={onEdit} disabled={isLoading} className="velora-link text-muted-foreground hover:text-foreground disabled:opacity-50">
            {t("dash.addr.edit")}
          </button>
          <button onClick={onDelete} disabled={isLoading} className="velora-link text-muted-foreground hover:text-destructive disabled:opacity-50">
            {t("dash.addr.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressForm({ initial, onSave, onCancel, isSaving }: { initial: AddressFormData; onSave: (data: AddressFormData) => void; onCancel: () => void; isSaving: boolean; }) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AddressFormData>(initial);
  const set = (k: keyof AddressFormData, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  
  return (
    <div className="border border-border p-8 bg-secondary space-y-6">
      <h3 className="font-serif text-2xl font-bold mb-6 border-b border-border pb-4">Address Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-full">
          <label className="velora-label block mb-2">{t("dash.addr.label")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.label} onChange={e => set("label", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.firstName")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.lastName")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
        </div>
        <div className="col-span-full">
          <label className="velora-label block mb-2">{t("dash.addr.address")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.address} onChange={e => set("address", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.city")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.city} onChange={e => set("city", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.phone")}</label>
          <input className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer mt-6 mb-8 group">
        <div className="relative flex items-center justify-center">
          <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="peer appearance-none w-5 h-5 border border-border bg-background checked:bg-foreground checked:border-foreground transition-colors cursor-pointer" />
          <Check className="absolute w-3 h-3 text-background opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
        </div>
        <span className="velora-label mt-1 text-foreground group-hover:opacity-70 transition-opacity">{t("dash.addr.setDefault")}</span>
      </label>
      <div className="flex gap-4 pt-6 border-t border-border">
        <button onClick={onCancel} disabled={isSaving} className="velora-btn-outline flex-1 h-14 justify-center">
          {t("dash.cancel")}
        </button>
        <button onClick={() => onSave(form)} disabled={isSaving} className="velora-btn-primary flex-[2] h-14 justify-center">
          {isSaving ? t("dash.addr.saving") : t("dash.addr.save")}
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
  const [name, setName] = useState(user?.name || "");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const { data: ordersData } = useListOrders({ userId: user?.id }, { query: { enabled: !!user, queryKey: getListOrdersQueryKey({ userId: user?.id }) } });
  const { data: wishlist, refetch: refetchWishlist } = useGetWishlist({ query: { enabled: !!user, queryKey: getGetWishlistQueryKey() } });
  const { data: notifications, refetch: refetchNotifications } = useListNotifications({ query: { enabled: !!user, queryKey: getListNotificationsQueryKey() } });
  const { data: addresses, refetch: refetchAddresses } = useQuery<UserAddress[]>({ queryKey: ["addresses"], queryFn: () => apiFetch("/api/addresses"), enabled: !!user });
  
  const createAddressMutation = useMutation({
    mutationFn: (data: AddressFormData) => apiFetch<UserAddress>("/api/addresses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); setShowAddressForm(false); toast({ title: t("dash.addr.saved") }); },
    onError: (e) => toast({ title: t("dash.addr.saveFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AddressFormData> }) => apiFetch<UserAddress>(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); setEditingAddress(null); toast({ title: t("dash.addr.updated") }); },
    onError: (e) => toast({ title: t("dash.addr.updateFailed"), description: (e as Error).message, variant: "destructive" }),
  });
  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); refetchAddresses(); toast({ title: t("dash.addr.deleted") }); },
  });
  
  const updateUserMutation = useUpdateUser();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const markReadMutation = useMarkNotificationRead();

  useEffect(() => { if (!user) setLocation("/login?from=/dashboard/customer"); }, [user, setLocation]);
  if (!user) return null;

  const allOrders = ordersData?.orders ?? [];
  const activeOrders = allOrders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length;

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
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="bg-secondary pt-24 pb-16 border-b border-border mb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <p className="velora-label text-muted-foreground mb-4">VELORA</p>
          <h1 className="font-serif text-5xl md:text-6xl font-bold mb-4">{t("dash.myAccount")}</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">{t("dash.welcomeBack")} <span className="font-bold text-foreground">{user.name}</span></p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Sidebar */}
          <div className="lg:w-64 shrink-0">
            {/* Mobile Horizontal scroll */}
            <div className="flex lg:hidden overflow-x-auto gap-8 border-b border-border pb-4 mb-8 no-scrollbar">
              {NAV_TABS.map(({ value, label, badge }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`velora-label whitespace-nowrap pb-4 border-b-2 transition-colors ${
                    activeTab === value ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ marginBottom: "-17px" }}
                >
                  {label}
                  {badge ? <span className="ml-2 bg-[#C9A227] text-background px-1.5 py-0.5">{badge}</span> : null}
                </button>
              ))}
            </div>

            {/* Desktop Vertical */}
            <div className="hidden lg:flex flex-col gap-1 border-r border-border pr-8">
              {NAV_TABS.map(({ value, label, icon: Icon, badge }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`flex items-center justify-between w-full p-4 transition-colors group ${
                    activeTab === value ? "bg-secondary" : "hover:bg-muted/10"
                  }`}
                >
                  <div className={`flex items-center gap-4 velora-label mb-0 ${activeTab === value ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    {label}
                  </div>
                  {badge ? <span className="bg-[#C9A227] text-background text-[9px] font-bold px-1.5 py-0.5">{badge}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="animate-in fade-in duration-500 space-y-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                  {[
                    { label: t("dash.totalOrders"), value: allOrders.length },
                    { label: t("dash.activeOrders"), value: activeOrders.length },
                    { label: t("dash.wishlistItems"), value: wishlist?.length ?? 0 },
                    { label: "Notifications", value: unreadCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="border border-border p-6 bg-secondary text-center">
                      <p className="font-serif text-4xl font-bold mb-3">{value}</p>
                      <p className="velora-label text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {activeOrders.length > 0 && (
                  <div>
                    <h3 className="font-serif text-2xl font-bold mb-8 border-b border-border pb-4">{t("dash.activeShipments")}</h3>
                    <div className="space-y-6">
                      {activeOrders.slice(0, 3).map(order => {
                        const stepIdx = STATUS_STEPS.indexOf(order.status);
                        const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                        return (
                          <div key={order.id} className="border border-border p-8 group hover:border-foreground/30 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                              <div>
                                <p className="font-serif text-2xl font-bold mb-2">Order #{order.id}</p>
                                <p className="velora-label text-muted-foreground">Placed {format(new Date(order.createdAt), "MMM d, yyyy")}</p>
                              </div>
                              <StatusBadge status={order.status} />
                            </div>
                            
                            <div className="mb-8">
                              <div className="h-0.5 bg-secondary relative w-full mb-3 overflow-hidden">
                                <div className="absolute top-0 left-0 h-full bg-[#C9A227] transition-all duration-1000" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="flex justify-between velora-label text-muted-foreground">
                                <span>Placed</span>
                                <span>Shipped</span>
                                <span>Delivered</span>
                              </div>
                            </div>
                            
                            <Link href={`/order/${order.id}/tracking`} className="velora-link text-foreground inline-flex items-center gap-2">
                              Track Order <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS */}
            {activeTab === "orders" && (
              <div className="animate-in fade-in duration-500">
                <h3 className="font-serif text-3xl font-bold mb-10 border-b border-border pb-6">{t("dash.tab.orders")}</h3>
                {allOrders.length === 0 ? (
                  <div className="text-center py-20 border border-border bg-secondary">
                    <p className="font-serif text-2xl text-muted-foreground mb-4">No orders yet</p>
                    <Link href="/products" className="velora-link text-foreground">Start Shopping</Link>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {allOrders.map(order => (
                      <div key={order.id} className="border border-border p-8 flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-4 mb-6">
                            <h4 className="font-serif text-2xl font-bold">Order #{order.id}</h4>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="velora-label text-muted-foreground mb-6">
                            {format(new Date(order.createdAt), "MMMM d, yyyy")} · {(order.items ?? []).reduce((acc, i) => acc + i.quantity, 0)} Items · {order.totalPrice} EGP
                          </p>
                          <div className="flex flex-wrap gap-6">
                            <Link href={`/order/${order.id}/tracking`} className="velora-link text-foreground">
                              Track Order
                            </Link>
                            <Link href={`/dashboard/customer?tab=support&order=${order.id}`} className="velora-link text-muted-foreground">
                              Need Help?
                            </Link>
                          </div>
                        </div>
                        <div className="flex gap-4 md:w-1/3 overflow-x-auto no-scrollbar shrink-0">
                          {(order.items ?? []).slice(0, 3).map((item, i) => (
                            <div key={i} className="w-24 aspect-[3/4] bg-secondary shrink-0">
                              {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                            </div>
                          ))}
                          {(order.items ?? []).length > 3 && (
                            <div className="w-24 aspect-[3/4] bg-secondary border border-border flex items-center justify-center shrink-0">
                              <span className="font-serif text-xl">+{(order.items ?? []).length - 3}</span>
                            </div>
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
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-10 border-b border-border pb-6">
                  <h3 className="font-serif text-3xl font-bold">{t("dash.tab.addresses")}</h3>
                  {!showAddressForm && !editingAddress && (
                    <button onClick={() => setShowAddressForm(true)} className="velora-link text-foreground">
                      {t("dash.addr.addNew")}
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <AddressForm initial={EMPTY_ADDRESS} onSave={d => createAddressMutation.mutate(d)} onCancel={() => setShowAddressForm(false)} isSaving={createAddressMutation.isPending} />
                ) : editingAddress ? (
                  <AddressForm initial={editingAddress} onSave={d => updateAddressMutation.mutate({ id: editingAddress.id, data: d })} onCancel={() => setEditingAddress(null)} isSaving={updateAddressMutation.isPending} />
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    {(addresses ?? []).map(addr => (
                      <AddressCard
                        key={addr.id}
                        addr={addr}
                        onEdit={() => setEditingAddress(addr)}
                        onDelete={() => deleteAddressMutation.mutate(addr.id)}
                        onSetDefault={() => updateAddressMutation.mutate({ id: addr.id, data: { isDefault: true } })}
                        isLoading={deleteAddressMutation.isPending || updateAddressMutation.isPending}
                      />
                    ))}
                    {(addresses ?? []).length === 0 && (
                       <div className="col-span-full text-center py-20 border border-border bg-secondary">
                        <p className="velora-label text-muted-foreground mb-4">No addresses saved</p>
                        <button onClick={() => setShowAddressForm(true)} className="velora-link text-foreground">Add your first address</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === "wishlist" && (
              <div className="animate-in fade-in duration-500">
                <h3 className="font-serif text-3xl font-bold mb-10 border-b border-border pb-6">{t("dash.tab.wishlist")}</h3>
                {!wishlist?.length ? (
                  <div className="text-center py-20 border border-border bg-secondary">
                    <p className="font-serif text-2xl text-muted-foreground mb-4">Your wishlist is empty</p>
                    <Link href="/products" className="velora-link text-foreground">Explore Collection</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                    {wishlist.map(item => (
                      <div key={item.productId} className="group relative">
                        <Link href={`/products/${item.product.id}`} className="block w-full aspect-[3/4] bg-secondary mb-4 overflow-hidden">
                          {item.product.images?.[0] && <img src={item.product.images[0].imageUrl} alt="" className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700" />}
                        </Link>
                        <button
                          onClick={() => removeFromWishlistMutation.mutate({ productId: item.product.id }, { onSuccess: () => refetchWishlist() })}
                          className="absolute top-4 right-4 w-10 h-10 bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <h4 className="font-serif text-lg font-bold mb-1 truncate">{language === 'en' ? item.product.nameEn : (item.product.nameAr || item.product.nameEn)}</h4>
                        <p className="velora-label text-muted-foreground">{item.product.price} EGP</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECURITY */}
            {activeTab === "security" && (
              <div className="animate-in fade-in duration-500">
                <h3 className="font-serif text-3xl font-bold mb-10 border-b border-border pb-6">{t("dash.tab.security")}</h3>
                <SecurityCenterTab />
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="animate-in fade-in duration-500">
                <h3 className="font-serif text-3xl font-bold mb-10 border-b border-border pb-6">{t("dash.tab.profile")}</h3>
                <div className="max-w-xl">
                  <div className="space-y-8 border border-border p-8 bg-secondary">
                    <div>
                      <label className="velora-label text-foreground block mb-3">Full Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full h-14 border border-border bg-background px-4 focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <div>
                      <label className="velora-label text-foreground block mb-3">Email Address</label>
                      <input 
                        type="email" 
                        value={user.email} 
                        disabled 
                        className="w-full h-14 border border-border bg-muted/20 px-4 text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-2">Email cannot be changed directly. Contact support if needed.</p>
                    </div>
                    <div className="pt-6 border-t border-border">
                      <button 
                        className="velora-btn-primary h-14 w-full justify-center"
                        onClick={() => updateUserMutation.mutate({ id: user.id, data: { name } }, { onSuccess: (u) => { login(u, localStorage.getItem("auth_token")||"", ""); toast({ title: "Profile updated" }) } })}
                        disabled={updateUserMutation.isPending || name === user.name}
                      >
                        {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other tabs to prevent blank screens */}
            {["support", "notifications", "payment-history", "my-reviews"].includes(activeTab) && (
              <div className="animate-in fade-in duration-500 text-center py-32 border border-border bg-secondary">
                <h3 className="font-serif text-3xl font-bold mb-4 capitalize">{activeTab.replace('-', ' ')}</h3>
                <p className="velora-label text-muted-foreground">Section under construction</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
