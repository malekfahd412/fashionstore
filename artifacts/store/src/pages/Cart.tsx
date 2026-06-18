import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, useClearCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingBag, X, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CouponData = { discountType: "percentage" | "fixed"; discountValue: number; code: string };

export default function Cart() {
  const { language, t } = useLanguage();
  useSEO({ title: t("cart.title"), description: "View and manage items in your Velora shopping cart." });
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

  // Logic to determine if empty
  const isGuestEmpty = !user && guest.items.length === 0;
  const isUserEmpty = user && (!cart || !cart.items || cart.items.length === 0);
  const isEmpty = isGuestEmpty || isUserEmpty;

  if (isLoading && user) {
    return <div className="min-h-screen flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">{t("common.loading")}</div>;
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-24 text-center">
        <div className="relative mb-12">
          <ShoppingBag className="h-24 w-24 text-muted-foreground/10" strokeWidth={0.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-px bg-accent/40" />
          </div>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl mb-8 tracking-tighter">{t("cart.empty")}</h1>
        <p className="text-muted-foreground mb-12 max-w-sm font-light leading-relaxed">{t("cart.emptyDesc")}</p>
        <Link href="/products" className="velora-btn-primary px-12 h-14">
          {t("btn.startShopping")}
        </Link>
      </div>
    );
  }

  const items = user ? (cart?.items || []) : guest.items;
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = user ? (cart?.subtotal ?? 0) : guest.subtotal;

  const calcDiscount = (): number => {
    if (!coupon) return 0;
    if (coupon.discountType === "percentage") return Math.min((subtotal * coupon.discountValue) / 100, subtotal);
    return Math.min(coupon.discountValue, subtotal);
  };

  const discount = calcDiscount();
  const total = Math.max(0, subtotal - discount);
  const checkoutUrl = coupon ? `/checkout?coupon=${encodeURIComponent(coupon.code)}` : "/checkout";

  return (
    <div className="min-h-screen bg-background pt-32 pb-32">
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
        <div className="mb-20">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight">{t("cart.title")}</h1>
            <span className="velora-label text-muted-foreground/60">
              {totalItems} {totalItems === 1 ? t("common.item") : t("common.items")}
            </span>
          </div>
          <div className="h-px bg-border w-full" />
        </div>

        {!user && (
          <div className="mb-16 border-l-2 border-primary bg-secondary/30 p-8 flex items-center gap-6 animate-in fade-in slide-in-from-left duration-700">
            <LogIn className="w-5 h-5 text-primary shrink-0" strokeWidth={1.5} />
            <p className="text-sm tracking-wide">
              {t("cart.guestBanner")}{" "}
              <Link href="/login" className="velora-link ml-2">{t("cart.loginToSave")}</Link>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-20">
          {/* Left: Items */}
          <div className="lg:col-span-8">
            <div className="space-y-0">
              {items.map(item => (
                <div key={item.variantId} className="flex gap-8 py-10 border-b border-border first:pt-0 group animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Link href={`/products/${item.productId}`} className="w-32 md:w-48 aspect-[3/4] bg-secondary shrink-0 overflow-hidden relative block">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />}
                  </Link>
                  <div className="flex-1 flex flex-col py-1">
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div className="space-y-2">
                        <Link href={`/products/${item.productId}`} className="font-serif text-2xl md:text-3xl hover:text-accent transition-colors block">
                          {language === 'en' ? item.nameEn : (item.nameAr || item.nameEn)}
                        </Link>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground/80 font-light">
                          {item.color && <span>{t("common.color")}: <span className="text-foreground">{item.color}</span></span>}
                          {item.size && <span>{t("common.size")}: <span className="text-foreground">{item.size}</span></span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {item.salePrice ? (
                          <>
                            <div className="font-medium text-lg text-accent">{Number(item.salePrice).toLocaleString()} EGP</div>
                            <div className="text-[10px] uppercase tracking-widest line-through text-muted-foreground/40 mt-1">{Number(item.price).toLocaleString()} EGP</div>
                          </>
                        ) : (
                          <div className="font-medium text-lg">{Number(item.price).toLocaleString()} EGP</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-border h-10 w-28">
                        <button
                          className="w-8 h-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30"
                          onClick={() => user ? handleUpdateQuantity(item.variantId, item.quantity - 1) : guest.updateItem(item.variantId, item.quantity - 1)}
                          disabled={user ? updateMutation.isPending || item.quantity <= 1 : item.quantity <= 1}
                        >−</button>
                        <div className="flex-1 text-center text-xs font-medium">{item.quantity}</div>
                        <button
                          className="w-8 h-full flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30"
                          onClick={() => user ? handleUpdateQuantity(item.variantId, item.quantity + 1) : guest.updateItem(item.variantId, item.quantity + 1)}
                          disabled={user ? updateMutation.isPending : false}
                        >+</button>
                      </div>
                      <button
                        className="velora-link text-muted-foreground/60 hover:text-destructive flex items-center gap-2 group/btn"
                        onClick={() => user ? handleRemove(item.variantId) : guest.removeItem(item.variantId)}
                        disabled={user ? removeMutation.isPending : false}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} /> 
                        <span className="text-[10px]">{t("btn.remove")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center py-12">
              <Link href="/products" className="velora-link text-foreground">
                {t("btn.continueShopping")}
              </Link>
              <button
                onClick={() => user ? handleClear() : guest.clear()}
                disabled={user ? clearMutation.isPending : false}
                className="velora-link text-muted-foreground/40 hover:text-destructive disabled:opacity-20"
              >
                {t("btn.clearCart")}
              </button>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4">
            <div className="bg-secondary/40 p-10 border border-border/50 sticky top-32 animate-in fade-in slide-in-from-right-4 duration-700">
              <h2 className="velora-label border-b border-border/50 pb-6 mb-10 text-foreground tracking-[0.4em]">{t("cart.orderSummary")}</h2>

              {/* Coupon */}
              <div className="mb-10">
                {coupon ? (
                  <div className="flex items-center justify-between border border-accent/30 bg-accent/5 px-4 py-4">
                    <span className="velora-label text-accent font-medium">{coupon.code} {t("cart.applied")}</span>
                    <button onClick={handleRemoveCoupon} className="text-accent hover:opacity-70 transition-opacity">
                      <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-0 group">
                    <Input
                      placeholder={t("cart.enterCode")}
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                      className="rounded-none border-border bg-background h-12 text-[10px] uppercase tracking-[0.2em] focus-visible:ring-0 focus-visible:border-accent border-r-0 transition-all placeholder:text-muted-foreground/30"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-8 bg-foreground text-background h-12 velora-label text-[10px] hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? "..." : t("btn.apply")}
                    </button>
                  </div>
                )}
                {couponError && <p className="velora-label text-destructive/80 mt-4 tracking-widest">{couponError}</p>}
              </div>

              {/* Totals */}
              <div className="space-y-5 mb-10 border-b border-border/50 pb-10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">{t("common.subtotal")}</span>
                  <span className="font-medium tracking-tight">{subtotal.toLocaleString()} EGP</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-destructive">
                    <span className="uppercase tracking-[0.2em] text-[10px]">{t("common.discount")}</span>
                    <span className="tracking-tight">−{discount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">{t("common.shipping")}</span>
                  <span className="velora-label text-accent tracking-[0.2em]">{t("common.free")}</span>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex justify-between items-end">
                  <span className="velora-label text-foreground tracking-[0.4em] mb-1">{t("common.total")}</span>
                  <span className="font-serif text-4xl font-medium tracking-tight">{total.toLocaleString()} EGP</span>
                </div>
              </div>

              {user ? (
                <button
                  className="velora-btn-primary w-full h-16 justify-center text-[10px] tracking-[0.4em]"
                  onClick={() => setLocation(checkoutUrl)}
                >
                  {t("btn.proceedToCheckout")}
                </button>
              ) : (
                <Link href="/login" className="velora-btn-primary w-full h-16 justify-center text-[10px] tracking-[0.4em]">
                  {t("btn.loginToCheckout")}
                </Link>
              )}
              
              <div className="mt-8 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50">
                <span>Secure Checkout</span>
                <span>•</span>
                <span>Free Shipping</span>
                <span>•</span>
                <span>Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
