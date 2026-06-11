import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListOrders, useGetWishlist, useRemoveFromWishlist, useUpdateUser, useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import SecurityCenterTab from "@/components/SecurityCenterTab";

export default function CustomerDashboard() {
  const { user, login } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Read ?tab and ?alert from URL so "This wasn't me" link lands on Security tab
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabParam = searchParams.get("tab");
  const alertParam = searchParams.get("alert");

  const [activeTab, setActiveTab] = useState(tabParam ?? "orders");
  const [name, setName] = useState(user?.name || "");
  
  const { data: ordersData } = useListOrders({ userId: user?.id }, { query: { enabled: !!user } });
  const { data: wishlist, refetch: refetchWishlist } = useGetWishlist({ query: { enabled: !!user } });
  const { data: notifications, refetch: refetchNotifications } = useListNotifications({ query: { enabled: !!user } });
  
  const updateUserMutation = useUpdateUser();
  const removeFromWishlistMutation = useRemoveFromWishlist();
  const markReadMutation = useMarkNotificationRead();

  if (!user) return <div className="p-16 text-center">Please login</div>;

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
      onSuccess: () => {
        toast({ title: "Removed from wishlist" });
        refetchWishlist();
      }
    });
  };

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => refetchNotifications()
    });
  };

  const triggerStyle = "justify-start px-4 py-3 data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-none border-l-2 border-transparent data-[state=active]:border-primary text-base";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-bold mb-2">My Account</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8">
        <TabsList className="flex flex-col w-full md:w-64 h-auto bg-transparent items-stretch space-y-2 p-0">
          <TabsTrigger value="orders" className={triggerStyle}>Orders</TabsTrigger>
          <TabsTrigger value="wishlist" className={triggerStyle}>Wishlist</TabsTrigger>
          <TabsTrigger value="notifications" className={`${triggerStyle} flex justify-between`}>
            Notifications
            {notifications?.some(n => !n.isRead) && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">New</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className={triggerStyle}>Security</TabsTrigger>
          <TabsTrigger value="profile" className={triggerStyle}>Profile Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="orders" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">Order History</h2>
            {!ordersData?.orders?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                <Button variant="outline" asChild>
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {ordersData.orders.map(order => (
                  <div key={order.id} className="border border-border p-6 flex flex-col md:flex-row gap-6 justify-between md:items-center">
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-bold">Order #{order.id}</span>
                        <span className="px-2 py-1 bg-muted text-xs uppercase tracking-wider">{order.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Placed on {format(new Date(order.createdAt), "MMM dd, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{order.items?.length || 0} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold mb-2">${order.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

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
                    <Button 
                      variant="outline" 
                      className="w-full mt-4" 
                      onClick={() => handleRemoveWishlist(item.productId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="m-0 space-y-6">
            <h2 className="text-2xl font-serif font-bold mb-6">Notifications</h2>
            {!notifications?.length ? (
              <div className="bg-muted/30 p-8 text-center border border-border">
                <p className="text-muted-foreground">You have no notifications.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map(notification => (
                  <div key={notification.id} className={`p-4 border ${notification.isRead ? 'border-border bg-transparent' : 'border-primary/50 bg-primary/5'} flex justify-between items-start`}>
                    <div>
                      <h4 className="font-bold mb-1">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(notification.createdAt), "MMM dd, yyyy HH:mm")}</p>
                    </div>
                    {!notification.isRead && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(notification.id)}>
                        Mark as read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="security" className="m-0">
            <SecurityCenterTab showAlert={alertParam === "1"} />
          </TabsContent>

          <TabsContent value="profile" className="m-0 space-y-6 max-w-md">
            <h2 className="text-2xl font-serif font-bold mb-6">Profile Settings</h2>
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
              <Button 
                onClick={handleUpdateProfile} 
                disabled={updateUserMutation.isPending || name === user.name}
                className="mt-4"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
