import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useListOrders, useGetWishlist, useRemoveFromWishlist, useUpdateUser, useListNotifications, useMarkNotificationRead,
  getListOrdersQueryKey, getGetWishlistQueryKey, getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";

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

function PaymentStatusBadge({ paymentMethod, status, paidAt }: { paymentMethod: string; status: string; paidAt?: string | null }) {
  if (paymentMethod === "cash_on_delivery") {
    if (status === "delivered") return <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">COD Paid</span>;
    return <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">Pay on Delivery</span>;
  }
  if (paidAt) return <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Paid</span>;
  return <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">Pending</span>;
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

function AddressCard({
  addr, onEdit, onDelete, onSetDefault, isLoading,
}: {
  addr: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isLoading: boolean;
}) {
  return (
    <div className={`border p-5 relative ${addr.isDefault ? "border-primary" : "border-border"}`}>
      {addr.isDefault && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-primary">
          <Star className="w-3 h-3 fill-primary" /> Default
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
            Set as default
          </button>
        )}
        <button onClick={onEdit} disabled={isLoading} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 ml-auto">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={onDelete} disabled={isLoading} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function AddressForm({
  initial, onSave, onCancel, isSaving,
}: {
  initial: AddressFormData;
  onSave: (data: AddressFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<AddressFormData>(initial);
  const set = (k: keyof AddressFormData, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="border border-border p-5 space-y-4 bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Label</label>
          <Input value={form.label} onChange={e => set("label", e.target.value)} placeholder="Home / Work / Other" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First Name *</label>
          <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="John" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Name *</label>
          <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Doe" />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address *</label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Fashion St" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City *</label>
          <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cairo" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone *</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+20 100 000 0000" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="w-4 h-4" />
        Set as default address
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={isSaving || !form.firstName || !form.lastName || !form.address || !form.city || !form.phone}>
          {isSaving ? "Saving..." : "Save Address"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabParam = searchParams.get("tab");
  const alertParam = searchParams.get("alert");

  const [activeTab, setActiveTab] = useState(tabParam ?? "orders");
  const [name, setName] = useState(user?.name || "");

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const { data: ordersData } = useListOrders({ userId: user?.id }, { query: { enabled: !!user, queryKey: getListOrdersQueryKey({ userId: user?.id }) } });
  const { data: wishlist, refetch: refetchWishlist } = useGetWishlist({ query: { enabled: !!user, queryKey: getGetWishlistQueryKey() } });
  const { data: notifications, refetch: refetchNotifications } = useListNotifications({ query: { enabled: !!user, queryKey: getListNotificationsQueryKey() } });

  const { data: addresses, refetch: refetchAddresses } = useQuery<UserAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => apiFetch("/api/addresses"),
    enabled: !!user,
  });

  const { data: emailPrefs, refetch: refetchEmailPrefs } = useQuery<{ emailPreferences: { orderUpdates: boolean; promotions: boolean; securityAlerts: boolean } }>({
    queryKey: ["email-preferences", user?.id],
    queryFn: () => apiFetch(`/api/users/${user!.id}`),
    enabled: !!user,
    select: (u) => ({ emailPreferences: (u as { emailPreferences?: { orderUpdates: boolean; promotions: boolean; securityAlerts: boolean } }).emailPreferences ?? { orderUpdates: true, promotions: true, securityAlerts: true } }),
  });

  const prefs = emailPrefs?.emailPreferences ?? { orderUpdates: true, promotions: true, securityAlerts: true };

  const createAddressMutation = useMutation({
    mutationFn: (data: AddressFormData) => apiFetch<UserAddress>("/api/addresses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { refetchAddresses(); setShowAddressForm(false); toast({ title: "Address saved" }); },
    onError: (e) => toast({ title: "Failed to save address", description: (e as Error).message, variant: "destructive" }),
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AddressFormData> }) =>
      apiFetch<UserAddress>(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { refetchAddresses(); setEditingAddress(null); toast({ title: "Address updated" }); },
    onError: (e) => toast({ title: "Failed to update address", description: (e as Error).message, variant: "destructive" }),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/addresses/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetchAddresses(); toast({ title: "Address deleted" }); },
  });

  const updateEmailPrefsMutation = useMutation({
    mutationFn: (data: Partial<{ orderUpdates: boolean; promotions: boolean; securityAlerts: boolean }>) =>
      apiFetch(`/api/users/${user!.id}/email-preferences`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { refetchEmailPrefs(); toast({ title: "Email preferences saved" }); },
  });

  const updateUserMutation = useUpdateUser();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const markReadMutation = useMarkNotificationRead();

  useEffect(() => {
    if (!user) setLocation("/login?from=/dashboard/customer");
  }, [user, setLocation]);

  if (!user) return null;

  const handleUpdateProfile = () => {
    if (!user) return;
    updateUserMutation.mutate(
      { id: user.id, data: { name } },
      {
        onSuccess: (updatedUser) => {
          login(
            updatedUser,
            localStorage.getItem("auth_token") || "",
            localStorage.getItem("auth_refresh_token") || "",
          );
          toast({ title: "Profile updated successfully" });
        }
      }
    );
  };

  const handleRemoveWishlist = (productId: number) => {
    removeFromWishlistMutation.mutate({ productId }, {
      onSuccess: () => { toast({ title: "Removed from wishlist" }); refetchWishlist(); }
    });
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, { onSuccess: () => refetchNotifications() });
  };

  const triggerStyle = "justify-start px-4 py-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-l-2 border-transparent data-[state=active]:border-primary text-base";

  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8">
        <TabsList className="flex flex-col w-full md:w-64 h-auto bg-transparent items-stretch space-y-2 p-0 shrink-0">
          <TabsTrigger value="orders" className={triggerStyle}>Orders</TabsTrigger>
          <TabsTrigger value="tracking" className={triggerStyle}>Track Orders</TabsTrigger>
          <TabsTrigger value="addresses" className={triggerStyle}>Addresses</TabsTrigger>
          <TabsTrigger value="wishlist" className={triggerStyle}>Wishlist</TabsTrigger>
          <TabsTrigger value="notifications" className={`${triggerStyle} flex justify-between`}>
            Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className={triggerStyle}>Security</TabsTrigger>
          <TabsTrigger value="profile" className={triggerStyle}>Profile Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          {/* ── ORDERS ─────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">Order History</h2>
            {!ordersData?.orders?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                <Button variant="outline" asChild><Link href="/products">Start Shopping</Link></Button>
              </div>
            ) : (
              <div className="space-y-4">
                {ordersData.orders.map(order => (
                  <div key={order.id} className="border border-border p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className="font-bold">Order #{order.id}</span>
                        <StatusBadge status={order.status} />
                        <PaymentStatusBadge
                          paymentMethod={order.paymentMethod}
                          status={order.status}
                          paidAt={(order as unknown as { paidAt?: string | null }).paidAt}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mb-0.5">Placed on {format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""} · {order.paymentMethod.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-4 md:flex-col md:items-end">
                      <p className="text-xl font-bold">${order.totalPrice.toFixed(2)}</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/order/${order.id}/tracking`}>Track Order</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TRACK ORDERS ────────────────────────────────────────────── */}
          <TabsContent value="tracking" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">Track Orders</h2>
            {(() => {
              const activeOrders = ordersData?.orders?.filter(o => !["delivered", "cancelled"].includes(o.status)) ?? [];
              if (!activeOrders.length) {
                return (
                  <div className="bg-muted/30 p-8 text-center border border-border">
                    <p className="text-muted-foreground mb-4">No active orders to track right now.</p>
                    <Button variant="outline" asChild><Link href="/products">Start Shopping</Link></Button>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {activeOrders.map(order => {
                    const STEPS = ["new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
                    const stepIdx = STEPS.indexOf(order.status);
                    const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);
                    return (
                      <div key={order.id} className="border border-border p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">Order #{order.id}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/order/${order.id}/tracking`}>View Details →</Link>
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Order placed</span>
                            <span>Delivered</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">{order.status.replace(/_/g, " ")} — {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* ── ADDRESSES ──────────────────────────────────────────────── */}
          <TabsContent value="addresses" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold">Saved Addresses</h2>
              {!showAddressForm && !editingAddress && (
                <Button size="sm" variant="outline" onClick={() => setShowAddressForm(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Address
                </Button>
              )}
            </div>

            {showAddressForm && (
              <AddressForm
                initial={EMPTY_ADDRESS}
                onSave={(d) => createAddressMutation.mutate(d)}
                onCancel={() => setShowAddressForm(false)}
                isSaving={createAddressMutation.isPending}
              />
            )}

            {!addresses?.length && !showAddressForm ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No saved addresses yet. Add one to speed up checkout.</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddressForm(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add First Address
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {addresses?.map(addr => (
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
                    <AddressCard
                      key={addr.id}
                      addr={addr}
                      onEdit={() => setEditingAddress(addr)}
                      onDelete={() => deleteAddressMutation.mutate(addr.id)}
                      onSetDefault={() => updateAddressMutation.mutate({ id: addr.id, data: { isDefault: true } })}
                      isLoading={deleteAddressMutation.isPending || updateAddressMutation.isPending}
                    />
                  )
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── WISHLIST ────────────────────────────────────────────────── */}
          <TabsContent value="wishlist" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">My Wishlist</h2>
            {!wishlist?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <p className="text-muted-foreground">Your wishlist is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {wishlist.map(item => (
                  <div key={item.productId} className="group border border-border p-4 flex flex-col">
                    <Link href={`/products/${item.productId}`} className="block aspect-[3/4] bg-muted mb-4 relative overflow-hidden">
                      {item.product.images?.[0] && (
                        <img src={item.product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </Link>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-1">{language === 'en' ? item.product.nameEn : item.product.nameAr}</h3>
                      <p className="font-bold">${item.product.price}</p>
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => handleRemoveWishlist(item.productId)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── NOTIFICATIONS ───────────────────────────────────────────── */}
          <TabsContent value="notifications" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">Notifications</h2>
            {!notifications?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <p className="text-muted-foreground">You have no notifications.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-4 border ${notification.isRead ? "border-border" : "border-primary/50 bg-primary/5"} flex justify-between items-start gap-4`}>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold mb-1 text-sm ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(notification.createdAt), "MMM dd, yyyy HH:mm")}</p>
                    </div>
                    {!notification.isRead && (
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handleMarkRead(notification.id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── SECURITY ────────────────────────────────────────────────── */}
          <TabsContent value="security" className="m-0">
            <SecurityCenterTab showAlert={alertParam === "1"} />
          </TabsContent>

          {/* ── PROFILE ─────────────────────────────────────────────────── */}
          <TabsContent value="profile" className="m-0 space-y-8 max-w-md">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Full Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input value={user.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <Button onClick={handleUpdateProfile} disabled={updateUserMutation.isPending || name === user.name}>
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-8 space-y-4">
              <h3 className="text-lg font-semibold">Email Notifications</h3>
              <p className="text-sm text-muted-foreground">Choose which emails you'd like to receive from LUXE.</p>
              <div className="space-y-3">
                {(
                  [
                    { key: "orderUpdates" as const, label: "Order Updates", desc: "Shipping, delivery, and status change emails" },
                    { key: "promotions" as const, label: "Promotions & Offers", desc: "Sales, new arrivals, and exclusive deals" },
                    { key: "securityAlerts" as const, label: "Security Alerts", desc: "New device logins and account security warnings" },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group">
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
