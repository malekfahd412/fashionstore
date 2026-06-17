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
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CouponData = { discountType: "percentage" | "fixed"; discountValue: number; code: string };

export default function Cart() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const guest = useGuestCart();
  const qc = useQueryClient();

  const { data: cart, isLoading } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();
  const clearMutation = useClearCart();

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const invalidateCart = () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() });

  const handleUpdateQuantity = (variantId: number, quantity: number) => {
    if (quantity < 1) return;
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
      if (!old) return old;
      const items = old.items.map(item => item.variantId === variantId ? { ...item, quantity } : item);
      const subtotal = items.reduce((acc, item) => acc + (Number(item.salePrice || item.price) * item.quantity), 0);
      return { ...old, items, subtotal };
    });
    updateMutation.mutate({ variantId, data: { quantity } }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSettled: invalidateCart,
    });
  };

  const handleRemove = (variantId: number) => {
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
      if (!old) return old;
      const items = old.items.filter(item => item.variantId !== variantId);
      const subtotal = items.reduce((acc, item) => acc + (Number(item.salePrice || item.price) * item.quantity), 0);
      return { ...old, items, subtotal };
    });
    removeMutation.mutate({ variantId }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSuccess: () => toast({ title: t("btn.remove") }),
      onSettled: invalidateCart,
    });
  };

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => { invalidateCart(); toast({ title: t("btn.clearCart") }); setCoupon(null); }
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
        setCouponError(err.error ?? t("cart.invalidCoupon"));
        return;
      }
      const data = await res.json() as { discountType: "percentage" | "fixed"; discountValue: number };
      setCoupon({ ...data, code });
      toast({ title: t("cart.couponAppliedTitle"), description: `${data.discountType === "percentage" ? `${data.discountValue}% off` : `${data.discountValue} EGP off`}` });
    } catch {
      setCouponError(t("cart.couponValidateError"));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Guest cart path
  if (!user) {
    if (guest.items.length === 0) {
      return (
        <div className="container mx-auto px-4 py-32 text-center max-w-xl">
          <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30 mb-8" />
          <h1 className="font-serif text-5xl font-bold mb-6">{t("cart.empty")}</h1>
          <p className="text-lg text-muted-foreground mb-10">{t("cart.emptyDesc")}</p>
          <Button size="lg" className="w-full md:w-auto px-12 rounded-none uppercase tracking-widest h-14" asChild>
            <Link href="/products">{t("btn.startShopping")}</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-baseline justify-between mb-12 border-b border-border pb-6">
          <h1 className="font-serif text-4xl md:text-5xl font-bold">{t("cart.title")}</h1>
          <span className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            {guest.totalItems} {guest.totalItems === 1 ? t("common.item") : t("common.items")}
          </span>
        </div>
        
        <div className="mb-10 bg-primary text-primary-foreground p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogIn className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">
              {t("cart.guestBanner")}{" "}
              <Link href="/login" className="underline underline-offset-4 font-bold hover:text-primary-foreground/80">{t("cart.loginToSave")}</Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-2/3 space-y-8">
            {guest.items.map(item => (
              <div key={item.variantId} className="flex gap-6 pb-8 border-b border-border group">
                <div className="w-32 md:w-40 aspect-[3/4] bg-muted shrink-0 overflow-hidden relative">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="flex-1 flex flex-col pt-2">
                  <div className="flex justify-between mb-2">
                    <Link href={`/products/${item.productId}`} className="font-serif text-xl font-bold hover:text-primary transition-colors line-clamp-2 pr-4">
                      {language === 'en' ? item.nameEn : item.nameAr}
                    </Link>
                    <div className="text-right shrink-0">
                      {item.salePrice ? (
                        <><div className="font-bold text-destructive text-lg">{item.salePrice} EGP</div><div className="text-sm line-through text-muted-foreground">{item.price} EGP</div></>
                      ) : (
                        <div className="font-bold text-lg">{item.price} EGP</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-auto space-y-1">
                    {item.color && <p><span className="uppercase tracking-widest text-xs font-bold mr-2 text-foreground">{t("common.color")}:</span> {item.color}</p>}
                    {item.size && <p><span className="uppercase tracking-widest text-xs font-bold mr-2 text-foreground">{t("common.size")}:</span> {item.size}</p>}
                  </div>

                  <div className="flex justify-between items-end mt-6">
                    <div className="flex items-center border border-border w-32 h-12">
                      <button className="w-12 hover:bg-muted h-full transition-colors flex items-center justify-center" onClick={() => guest.updateItem(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                      <div className="flex-1 text-center font-bold text-sm">{item.quantity}</div>
                      <button className="w-12 hover:bg-muted h-full transition-colors flex items-center justify-center" onClick={() => guest.updateItem(item.variantId, item.quantity + 1)}>+</button>
                    </div>
                    <button className="text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2 pb-1" onClick={() => guest.removeItem(item.variantId)}>
                      <Trash2 className="h-4 w-4" /> {t("btn.remove")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-8 flex justify-between items-center">
              <Link href="/products" className="text-sm uppercase tracking-widest font-bold border-b border-foreground pb-1 hover:text-muted-foreground hover:border-muted-foreground transition-colors">
                {t("btn.continueShopping")}
              </Link>
              <button onClick={guest.clear} className="text-sm uppercase tracking-widest font-bold text-muted-foreground hover:text-destructive transition-colors">
                {t("btn.clearCart")}
              </button>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-muted/10 p-8 border border-border sticky top-32 space-y-8">
              <h2 className="font-serif text-2xl font-bold uppercase tracking-widest border-b border-border pb-6">{t("cart.orderSummary")}</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.subtotal")}</span>
                  <span className="font-medium">{guest.subtotal.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.shipping")}</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-widest">{t("common.free")}</span>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase tracking-widest">{t("common.total")}</span>
                  <span className="font-serif text-3xl font-bold">{guest.subtotal.toFixed(2)} EGP</span>
                </div>
              </div>

              <Button size="lg" className="w-full rounded-none uppercase tracking-widest h-16 text-sm font-bold mt-4" asChild>
                <Link href="/login">{t("btn.loginToCheckout")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-32 text-center text-muted-foreground uppercase tracking-widest font-bold">{t("common.loading")}</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-xl">
        <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/30 mb-8" />
        <h1 className="font-serif text-5xl font-bold mb-6">{t("cart.empty")}</h1>
        <p className="text-lg text-muted-foreground mb-10">{t("cart.emptyDesc")}</p>
        <Button size="lg" className="w-full md:w-auto px-12 rounded-none uppercase tracking-widest h-14" asChild>
          <Link href="/products">{t("btn.startShopping")}</Link>
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
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-baseline justify-between mb-12 border-b border-border pb-6">
        <h1 className="font-serif text-4xl md:text-5xl font-bold">{t("cart.title")}</h1>
        <span className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
          {totalItems} {totalItems === 1 ? t("common.item") : t("common.items")}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Cart Items */}
        <div className="lg:w-2/3 space-y-8">
          {cart.items.map(item => (
            <div key={item.variantId} className="flex gap-6 pb-8 border-b border-border group">
              <div className="w-32 md:w-40 aspect-[3/4] bg-muted shrink-0 overflow-hidden relative">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              </div>
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex justify-between mb-2">
                  <Link href={`/products/${item.productId}`} className="font-serif text-xl font-bold hover:text-primary transition-colors line-clamp-2 pr-4">
                    {language === 'en' ? item.nameEn : (item.nameAr || item.nameEn)}
                  </Link>
                  <div className="text-right shrink-0">
                    {item.salePrice ? (
                      <>
                        <div className="font-bold text-destructive text-lg">{Number(item.salePrice).toLocaleString()} EGP</div>
                        <div className="text-sm line-through text-muted-foreground">{Number(item.price).toLocaleString()} EGP</div>
                      </>
                    ) : (
                      <div className="font-bold text-lg">{Number(item.price).toLocaleString()} EGP</div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-auto space-y-1">
                  {item.color && <p><span className="uppercase tracking-widest text-xs font-bold mr-2 text-foreground">{t("common.color")}:</span> {item.color}</p>}
                  {item.size && <p><span className="uppercase tracking-widest text-xs font-bold mr-2 text-foreground">{t("common.size")}:</span> {item.size}</p>}
                </div>

                <div className="flex justify-between items-end mt-6">
                  <div className="flex items-center border border-border w-32 h-12">
                    <button
                      className="w-12 hover:bg-muted h-full transition-colors flex items-center justify-center"
                      onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                      disabled={updateMutation.isPending || item.quantity <= 1}
                    >−</button>
                    <div className="flex-1 text-center font-bold text-sm">{item.quantity}</div>
                    <button
                      className="w-12 hover:bg-muted h-full transition-colors flex items-center justify-center"
                      onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                      disabled={updateMutation.isPending}
                    >+</button>
                  </div>
                  <button
                    className="text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2 pb-1 disabled:opacity-50"
                    onClick={() => handleRemove(item.variantId)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("btn.remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-8 flex justify-between items-center">
            <Link href="/products" className="text-sm uppercase tracking-widest font-bold border-b border-foreground pb-1 hover:text-muted-foreground hover:border-muted-foreground transition-colors">
              {t("btn.continueShopping")}
            </Link>
            <button onClick={handleClear} disabled={clearMutation.isPending} className="text-sm uppercase tracking-widest font-bold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
              {t("btn.clearCart")}
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:w-1/3">
          <div className="bg-muted/10 p-8 border border-border sticky top-32 space-y-8">
            <h2 className="font-serif text-2xl font-bold uppercase tracking-widest border-b border-border pb-6">{t("cart.orderSummary")}</h2>

            {/* Coupon */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" /> {t("cart.haveCoupon")}
              </p>
              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">{coupon.code} {t("cart.applied")}</span>
                  <button onClick={handleRemoveCoupon} className="text-emerald-600 hover:text-emerald-900 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-0">
                  <Input
                    placeholder={t("cart.enterCode")}
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                    className="uppercase text-sm h-12 rounded-none border-r-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50 font-bold tracking-widest"
                  />
                  <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()} className="h-12 rounded-none uppercase tracking-widest text-xs font-bold px-6">
                    {couponLoading ? "..." : t("btn.apply")}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive font-bold uppercase tracking-widest mt-2">{couponError}</p>}
            </div>

            {/* Totals */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("common.subtotal")}</span>
                <span className="font-medium">{subtotal.toFixed(2)} EGP</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-destructive font-bold">
                  <span className="uppercase tracking-widest">{t("common.discount")}</span>
                  <span>−{discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("common.shipping")}</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest">{t("common.free")}</span>
              </div>
            </div>

            <div className="border-t border-foreground pt-6 mt-6">
              <div className="flex justify-between items-center">
                <span className="font-bold uppercase tracking-widest">{t("common.total")}</span>
                <span className="font-serif text-3xl font-bold">{total.toFixed(2)} EGP</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-none uppercase tracking-widest h-16 text-sm font-bold mt-4 hover:bg-primary/90 transition-colors"
              onClick={() => setLocation(checkoutUrl)}
            >
              {t("btn.proceedToCheckout")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}