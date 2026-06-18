import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import {
  useListOrders, useGetWishlist, useRemoveFromWishlist, useUpdateUser,
  useListNotifications, useMarkNotificationRead,
  getListOrdersQueryKey, getGetWishlistQueryKey, getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";
import { useSEO } from "@/hooks/useSEO";
import {
  MapPin, Trash2, Star, ShoppingBag,
  Heart, Bell, Shield, Settings, LayoutDashboard,
  Check, MessageCircle, CreditCard
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
      isPositive ? "text-[#C8A96B] border-[#C8A96B]/30 bg-[#C8A96B]/5" :
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
    <div className={`border p-8 relative transition-colors ${addr.isDefault ? "border-foreground" : "border-border hover:border-foreground/30"} bg-card`}>
      {addr.isDefault && (
        <span className="absolute top-8 right-8 velora-label text-[#C8A96B] flex items-center gap-2">
          <Star className="w-3 h-3 fill-current" /> {t("dash.addr.default")}
        </span>
      )}
      <div className="mb-8">
        <p className="font-serif text-xl font-bold mb-4">{addr.label}</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{addr.firstName} {addr.lastName}</p>
          <p className="font-light">{addr.address}</p>
          <p className="font-light">{addr.city}</p>
          <p className="pt-2 font-light">{addr.phone}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border">
        {!addr.isDefault ? (
          <button onClick={onSetDefault} disabled={isLoading} className="velora-link text-muted-foreground hover:text-[#C8A96B] disabled:opacity-50">
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
    <div className="border border-border p-8 bg-card space-y-8">
      <h3 className="font-serif text-2xl font-bold mb-6 border-b border-border pb-4">Address Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="col-span-full">
          <label className="velora-label block mb-2">{t("dash.addr.label")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.label} onChange={e => set("label", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.firstName")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.lastName")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
        </div>
        <div className="col-span-full">
          <label className="velora-label block mb-2">{t("dash.addr.address")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.address} onChange={e => set("address", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.city")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.city} onChange={e => set("city", e.target.value)} />
        </div>
        <div>
          <label className="velora-label block mb-2">{t("dash.addr.phone")}</label>
          <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" value={form.phone} onChange={e => set("phone", e.target.value)} />
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
  const { user } = useAuth();
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
    <div className="bg-background min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-border flex flex-col p-10 hidden lg:flex shrink-0">
        <div className="font-serif text-2xl tracking-widest mb-16">
          VELORA
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          {NAV_TABS.map(({ value, label, badge }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`text-left velora-label transition-colors relative ${
                activeTab === value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === value && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#C8A96B] rounded-full"></div>
              )}
              {label}
              {badge ? <span className="ml-2 bg-[#C8A96B] text-background px-1.5 py-0.5">{badge}</span> : null}
            </button>
          ))}
        </nav>
        <button 
          onClick={() => {
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
          }}
          className="text-left velora-label text-[#5B1E2D] hover:text-[#5B1E2D]/70 transition-colors mt-auto"
        >
          {t("dash.logout") || "SIGN OUT"}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 lg:p-20 overflow-y-auto">
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
              {badge ? <span className="ml-2 bg-[#C8A96B] text-background px-1.5 py-0.5">{badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="max-w-5xl mx-auto">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl lg:text-5xl mb-2 text-foreground">
                {language === "ar" ? `مرحباً، ${user.name}` : `Good afternoon, ${user.name}.`}
              </h1>
              <p className="text-muted-foreground font-light mb-16 text-sm">{t("dash.welcomeBack")}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {[
                  { label: t("dash.totalOrders"), value: allOrders.length },
                  { label: t("dash.activeOrders"), value: activeOrders.length },
                  { label: t("dash.wishlistItems"), value: wishlist?.length ?? 0 },
                  { label: "Notifications", value: unreadCount },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-border p-8 bg-card group hover:border-foreground/20 transition-colors">
                    <h3 className="velora-label mb-4 text-muted-foreground">{label}</h3>
                    <div className="font-serif text-3xl mb-2">{value}</div>
                  </div>
                ))}
              </div>

              {activeOrders.length > 0 && (
                <div className="mb-16">
                  <h3 className="font-serif text-2xl mb-8">{t("dash.activeShipments")}</h3>
                  <div className="space-y-6">
                    {activeOrders.slice(0, 3).map(order => {
                      const stepIdx = STATUS_STEPS.indexOf(order.status);
                      const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
                      return (
                        <div key={order.id} className="border border-border p-8 bg-card group hover:border-foreground/20 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                              <h4 className="velora-label mb-2 text-muted-foreground">RECENT ORDER</h4>
                              <div className="font-serif text-2xl mb-2">#{order.id}</div>
                              <div className="text-sm font-light text-muted-foreground">
                                {order.status.replace(/_/g, " ")} • {format(new Date(order.createdAt), "MMM d, yyyy")}
                              </div>
                            </div>
                            <StatusBadge status={order.status} />
                          </div>
                          
                          <div className="mb-8">
                            <div className="h-px bg-border relative w-full mb-4">
                              <div className="absolute top-0 left-0 h-full bg-[#C8A96B] transition-all duration-1000" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between velora-label text-[8px] text-muted-foreground">
                              <span>Placed</span>
                              <span>Processing</span>
                              <span>Shipped</span>
                              <span>Delivered</span>
                            </div>
                          </div>
                          
                          <Link href={`/order/${order.id}/tracking`} className="velora-link text-foreground">
                            TRACK ORDER
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {wishlist && wishlist.length > 0 && (
                <div>
                  <h3 className="font-serif text-2xl mb-8">{t("dash.tab.wishlist")} Preview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {wishlist.slice(0, 4).map(item => (
                      <Link key={item.productId} href={`/product/${item.productId}`} className="group block">
                        <div className="aspect-[3/4] bg-card border border-border mb-4 overflow-hidden">
                          {item.product?.images?.[0]?.imageUrl && (
                            <img 
                              src={item.product.images[0].imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                            />
                          )}
                        </div>
                        <h4 className="font-serif text-base group-hover:text-[#C8A96B] transition-colors">{language === "ar" ? item.product?.nameAr : item.product?.nameEn}</h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.orders")}</h1>
              {allOrders.length === 0 ? (
                <div className="text-center py-32 border border-border bg-card">
                  <p className="font-serif text-2xl text-muted-foreground mb-6">No orders yet</p>
                  <Link href="/products" className="velora-btn-primary">Start Shopping</Link>
                </div>
              ) : (
                <div className="bg-card border border-border overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="velora-label p-8 text-muted-foreground">ORDER</th>
                        <th className="velora-label p-8 text-muted-foreground">DATE</th>
                        <th className="velora-label p-8 text-muted-foreground">TOTAL</th>
                        <th className="velora-label p-8 text-muted-foreground">STATUS</th>
                        <th className="velora-label p-8 text-muted-foreground text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-light">
                      {allOrders.map(order => (
                        <tr key={order.id} className="border-b border-border hover:bg-muted/5 transition-colors group">
                          <td className="p-8 font-serif text-base">#{order.id}</td>
                          <td className="p-8 text-muted-foreground">{format(new Date(order.createdAt), "MMM d, yyyy")}</td>
                          <td className="p-8 font-medium">{order.totalPrice} EGP</td>
                          <td className="p-8"><StatusBadge status={order.status} /></td>
                          <td className="p-8 text-right">
                            <Link href={`/order/${order.id}/tracking`} className="velora-link">VIEW</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES */}
          {activeTab === "addresses" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between mb-12">
                <h1 className="font-serif text-4xl text-foreground">{t("dash.tab.addresses")}</h1>
                {!showAddressForm && !editingAddress && (
                  <button onClick={() => setShowAddressForm(true)} className="velora-btn-outline px-8 py-3">
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
                     <div className="col-span-full text-center py-32 border border-border bg-card">
                      <p className="velora-label text-muted-foreground mb-6">No addresses saved</p>
                      <button onClick={() => setShowAddressForm(true)} className="velora-btn-primary">Add your first address</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* WISHLIST */}
          {activeTab === "wishlist" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.wishlist")}</h1>
              {!wishlist?.length ? (
                <div className="text-center py-32 border border-border bg-card">
                  <p className="font-serif text-2xl text-muted-foreground mb-6">Your wishlist is empty</p>
                  <Link href="/products" className="velora-btn-primary">Explore Collection</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-10">
                  {wishlist.map(item => (
                    <div key={item.productId} className="group relative">
                      <div className="aspect-[3/4] bg-card border border-border mb-6 overflow-hidden relative">
                        {item.product?.images?.[0]?.imageUrl && (
                          <img 
                            src={item.product.images[0].imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          />
                        )}
                        <button
                          onClick={() => removeFromWishlistMutation.mutate({ productId: item.productId }, { onSuccess: () => refetchWishlist() })}
                          className="absolute top-4 right-4 bg-background p-3 hover:bg-destructive hover:text-white transition-colors border border-border"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                           <Link href={`/product/${item.productId}`} className="w-full velora-btn-primary justify-center">
                            VIEW PIECE
                          </Link>
                        </div>
                      </div>
                      <h4 className="font-serif text-xl mb-1">{language === "ar" ? item.product?.nameAr : item.product?.nameEn}</h4>
                      <p className="text-[#C8A96B] font-medium">{item.product?.price} EGP</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.notifications")}</h1>
              {(!notifications || notifications.length === 0) ? (
                <div className="text-center py-32 border border-border bg-card">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-6" strokeWidth={1} />
                  <p className="font-serif text-2xl text-muted-foreground">All caught up</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`p-8 border border-border bg-card flex items-start gap-6 transition-colors ${!notif.isRead ? "border-l-4 border-l-[#C8A96B]" : "opacity-70"}`}>
                      <div className={`p-3 bg-muted/20 ${!notif.isRead ? "text-[#C8A96B]" : "text-muted-foreground"}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-serif text-xl">{notif.title}</h4>
                          <span className="velora-label text-[8px] text-muted-foreground">{format(new Date(notif.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-muted-foreground font-light mb-6">{notif.message}</p>
                        {!notif.isRead && (
                          <button
                            onClick={() => markReadMutation.mutate({ id: notif.id }, { onSuccess: () => refetchNotifications() })}
                            className="velora-link"
                          >
                            MARK AS READ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.profile")}</h1>
              <div className="space-y-10 bg-card border border-border p-10">
                <div>
                  <label className="velora-label block mb-4">{t("dash.profile.name")}</label>
                  <input
                    className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="velora-label block mb-4">{t("dash.profile.email")}</label>
                  <input
                    className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none opacity-50 cursor-not-allowed"
                    value={user.email}
                    disabled
                  />
                </div>
                <button
                  onClick={() => updateUserMutation.mutate({ id: user.id, data: { name } }, { onSuccess: () => toast({ title: t("dash.profile.updated") }) })}
                  disabled={updateUserMutation.isPending}
                  className="velora-btn-primary w-full justify-center h-14"
                >
                  {updateUserMutation.isPending ? t("dash.profile.saving") : t("dash.profile.save")}
                </button>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.security")}</h1>
              <div className="bg-card border border-border p-10">
                <SecurityCenterTab />
              </div>
            </div>
          )}

          {/* SUPPORT */}
          {activeTab === "support" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-serif text-4xl mb-12 text-foreground">{t("dash.tab.support")}</h1>
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="bg-card border border-border p-10">
                   <h3 className="font-serif text-2xl mb-8">Open a Ticket</h3>
                   <div className="space-y-8">
                     <div>
                       <label className="velora-label block mb-4">SUBJECT</label>
                       <input className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors" placeholder="How can we help?" />
                     </div>
                     <div>
                       <label className="velora-label block mb-4">MESSAGE</label>
                       <textarea className="w-full bg-transparent border-b border-border pb-2 text-[15px] font-light outline-none focus:border-foreground transition-colors min-h-[120px] resize-none" placeholder="Describe your issue..." />
                     </div>
                     <button className="velora-btn-primary w-full justify-center">SUBMIT REQUEST</button>
                   </div>
                </div>
                <div>
                  <h3 className="font-serif text-2xl mb-8">Past Conversations</h3>
                  <div className="text-center py-20 border border-border bg-card">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-6" strokeWidth={1} />
                    <p className="text-muted-foreground">No active support tickets</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
