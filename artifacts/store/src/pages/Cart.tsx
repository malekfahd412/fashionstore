import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, useClearCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingBag, Tag, X, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/hooks/useGuestCart";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CouponData = { discountType: "percentage" | "fixed"; discountValue: number; code: string };

export default function Cart() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const guest = useGuestCart();

  const { data: cart, isLoading } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();
  const clearMutation = useClearCart();

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const handleUpdateQuantity = (variantId: number, quantity: number) => {
    if (quantity < 1) return;
    updateMutation.mutate({ variantId, data: { quantity } });
  };

  const handleRemove = (variantId: number) => {
    removeMutation.mutate({ variantId }, {
      onSuccess: () => toast({ title: "Item removed" })
    });
  };

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => { toast({ title: "Cart cleared" }); setCoupon(null); }
    });
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setCouponError(err.error ?? "Invalid coupon");
        return;
      }
      const data = await res.json() as { discountType: "percentage" | "fixed"; discountValue: number };
      setCoupon({ ...data, code });
      toast({ title: "Coupon applied!", description: `${data.discountType === "percentage" ? `${data.discountValue}% off` : `$${data.discountValue} off`}` });
    } catch {
      setCouponError("Failed to validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Guest cart path — user is not logged in
  if (!user) {
    if (guest.items.length === 0) {
      return (
        <div className="container mx-auto px-4 py-32 text-center max-w-lg">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-6" />
          <h1 className="font-serif text-4xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
          <Button size="lg" className="w-full rounded-none uppercase tracking-widest h-14" asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-baseline justify-between mb-10">
          <h1 className="font-serif text-4xl font-bold">Shopping Cart</h1>
          <span className="text-muted-foreground text-sm">{guest.totalItems} {guest.totalItems === 1 ? "item" : "items"}</span>
        </div>
        <div className="mb-6 border border-primary/20 bg-primary/5 px-5 py-3 flex items-center gap-3">
          <LogIn className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm">You're browsing as a guest. <Link href="/login" className="font-medium underline">Log in</Link> to save your cart and complete checkout.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-2/3 space-y-6">
            {guest.items.map(item => (
              <div key={item.variantId} className="flex gap-6 border-b border-border pb-6">
                <div className="w-24 md:w-32 aspect-[3/4] bg-muted shrink-0 overflow-hidden">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between mb-2">
                    <Link href={`/products/${item.productId}`} className="font-medium hover:underline text-lg line-clamp-2">
                      {language === 'en' ? item.nameEn : item.nameAr}
                    </Link>
                    <div className="text-right shrink-0 ml-4">
                      {item.salePrice ? (
                        <><div className="font-bold text-destructive">${item.salePrice}</div><div className="text-sm line-through text-muted-foreground">${item.price}</div></>
                      ) : (
                        <div className="font-bold">${item.price}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-auto">
                    <span className="mr-4">Color: {item.color}</span>
                    <span>Size: {item.size}</span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center border border-border w-24 md:w-32 h-10">
                      <button className="flex-1 hover:bg-muted h-full transition-colors" onClick={() => guest.updateItem(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                      <div className="flex-1 text-center font-medium">{item.quantity}</div>
                      <button className="flex-1 hover:bg-muted h-full transition-colors" onClick={() => guest.updateItem(item.variantId, item.quantity + 1)}>+</button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => guest.removeItem(item.variantId)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-between items-center">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                <Link href="/products">← Continue Shopping</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={guest.clear} className="text-muted-foreground">Clear Cart</Button>
            </div>
          </div>
          <div className="lg:w-1/3">
            <div className="bg-muted/30 p-8 border border-border sticky top-24 space-y-6">
              <h2 className="font-serif text-2xl font-bold border-b border-border pb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({guest.totalItems} items)</span>
                  <span>${guest.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xl">Total</span>
                  <span className="font-bold text-2xl">${guest.subtotal.toFixed(2)}</span>
                </div>
              </div>
              <Button size="lg" className="w-full rounded-none uppercase tracking-widest h-14 text-lg" asChild>
                <Link href="/login"><LogIn className="h-4 w-4 mr-2" /> Login to Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading cart...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-lg">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-6" />
        <h1 className="font-serif text-4xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
        <Button size="lg" className="w-full rounded-none uppercase tracking-widest h-14" asChild>
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.subtotal ?? 0;

  const calcDiscount = (): number => {
    if (!coupon) return 0;
    if (coupon.discountType === "percentage") return Math.min((subtotal * coupon.discountValue) / 100, subtotal);
    return Math.min(coupon.discountValue, subtotal);
  };

  const discount = calcDiscount();
  const total = Math.max(0, subtotal - discount);

  const checkoutUrl = coupon ? `/checkout?coupon=${encodeURIComponent(coupon.code)}` : "/checkout";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif text-4xl font-bold">Shopping Cart</h1>
        <span className="text-muted-foreground text-sm">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* ── Cart Items ─────────────────────────────────────────────── */}
        <div className="lg:w-2/3">
          <div className="space-y-6">
            {cart.items.map(item => (
              <div key={item.variantId} className="flex gap-6 border-b border-border pb-6">
                <div className="w-24 md:w-32 aspect-[3/4] bg-muted shrink-0 overflow-hidden">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between mb-2">
                    <Link href={`/products/${item.productId}`} className="font-medium hover:underline text-lg line-clamp-2">
                      {language === 'en' ? item.nameEn : item.nameAr}
                    </Link>
                    <div className="text-right shrink-0 ml-4">
                      {item.salePrice ? (
                        <>
                          <div className="font-bold text-destructive">${item.salePrice}</div>
                          <div className="text-sm line-through text-muted-foreground">${item.price}</div>
                        </>
                      ) : (
                        <div className="font-bold">${item.price}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-auto">
                    <span className="mr-4">Color: {item.color}</span>
                    <span>Size: {item.size}</span>
                  </div>

                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center border border-border w-24 md:w-32 h-10">
                      <button
                        className="flex-1 hover:bg-muted h-full transition-colors"
                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                        disabled={updateMutation.isPending || item.quantity <= 1}
                      >−</button>
                      <div className="flex-1 text-center font-medium">{item.quantity}</div>
                      <button
                        className="flex-1 hover:bg-muted h-full transition-colors"
                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                        disabled={updateMutation.isPending}
                      >+</button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(item.variantId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/products">← Continue Shopping</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={clearMutation.isPending} className="text-muted-foreground">
              Clear Cart
            </Button>
          </div>
        </div>

        {/* ── Order Summary ──────────────────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="bg-muted/30 p-8 border border-border sticky top-24 space-y-6">
            <h2 className="font-serif text-2xl font-bold border-b border-border pb-4">Order Summary</h2>

            {/* Coupon input */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Have a coupon?
              </p>
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span className="text-sm font-medium text-green-700">{coupon.code} applied</span>
                  <button onClick={handleRemoveCoupon} className="text-green-600 hover:text-green-800 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                    className="uppercase text-sm h-9"
                  />
                  <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()}>
                    {couponLoading ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
            </div>

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Coupon discount</span>
                  <span>−${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Total</span>
                <span className="font-bold text-2xl">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-none uppercase tracking-widest h-14 text-lg"
              onClick={() => setLocation(checkoutUrl)}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
