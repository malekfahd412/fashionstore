import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, useClearCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-24 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-8" strokeWidth={1} />
        <h1 className="font-serif text-5xl font-bold mb-6">{t("cart.empty")}</h1>
        <p className="text-muted-foreground mb-10 max-w-md">{t("cart.emptyDesc")}</p>
        <Link href="/products" className="velora-btn-primary px-10 h-14">
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
    <div className="min-h-screen bg-background pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between border-b border-border pb-8 mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-bold">{t("cart.title")}</h1>
          <span className="velora-label text-muted-foreground">
            {totalItems} {totalItems === 1 ? t("common.item") : t("common.items")}
          </span>
        </div>

        {!user && (
          <div className="mb-12 border border-primary/20 bg-primary/5 p-6 flex items-center gap-4">
            <LogIn className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-medium">
              {t("cart.guestBanner")}{" "}
              <Link href="/login" className="velora-link font-bold">{t("cart.loginToSave")}</Link>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Left: Items */}
          <div className="lg:col-span-8 space-y-12">
            {items.map(item => (
              <div key={item.variantId} className="flex gap-6 pb-12 border-b border-border group">
                <Link href={`/products/${item.productId}`} className="w-32 md:w-40 aspect-[3/4] bg-muted shrink-0 overflow-hidden relative block">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700" />}
                </Link>
                <div className="flex-1 flex flex-col pt-2">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <Link href={`/products/${item.productId}`} className="font-serif text-2xl font-bold hover:opacity-70 transition-opacity line-clamp-2">
                      {language === 'en' ? item.nameEn : (item.nameAr || item.nameEn)}
                    </Link>
                    <div className="text-right shrink-0">
                      {item.salePrice ? (
                        <>
                          <div className="font-bold text-destructive text-lg">{Number(item.salePrice).toLocaleString()} EGP</div>
                          <div className="text-xs line-through text-muted-foreground mt-1">{Number(item.price).toLocaleString()} EGP</div>
                        </>
                      ) : (
                        <div className="font-bold text-lg">{Number(item.price).toLocaleString()} EGP</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-auto text-sm">
                    {item.color && <p><span className="velora-label text-muted-foreground mr-2">{t("common.color")}:</span> <span className="font-medium">{item.color}</span></p>}
                    {item.size && <p><span className="velora-label text-muted-foreground mr-2">{t("common.size")}:</span> <span className="font-medium">{item.size}</span></p>}
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center border border-border h-12 w-32">
                      <button
                        className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                        onClick={() => user ? handleUpdateQuantity(item.variantId, item.quantity - 1) : guest.updateItem(item.variantId, item.quantity - 1)}
                        disabled={user ? updateMutation.isPending || item.quantity <= 1 : item.quantity <= 1}
                      >−</button>
                      <div className="flex-1 text-center font-bold text-sm">{item.quantity}</div>
                      <button
                        className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                        onClick={() => user ? handleUpdateQuantity(item.variantId, item.quantity + 1) : guest.updateItem(item.variantId, item.quantity + 1)}
                        disabled={user ? updateMutation.isPending : false}
                      >+</button>
                    </div>
                    <button
                      className="velora-link text-muted-foreground hover:text-destructive flex items-center gap-2"
                      onClick={() => user ? handleRemove(item.variantId) : guest.removeItem(item.variantId)}
                      disabled={user ? removeMutation.isPending : false}
                    >
                      <Trash2 className="h-3 w-3" /> {t("btn.remove")}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-4">
              <Link href="/products" className="velora-link text-foreground">
                {t("btn.continueShopping")}
              </Link>
              <button
                onClick={() => user ? handleClear() : guest.clear()}
                disabled={user ? clearMutation.isPending : false}
                className="velora-link text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                {t("btn.clearCart")}
              </button>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-4">
            <div className="bg-secondary p-8 border border-border sticky top-32">
              <h2 className="velora-label border-b border-border pb-4 mb-8 text-foreground">{t("cart.orderSummary")}</h2>

              {/* Coupon */}
              <div className="mb-8">
                {coupon ? (
                  <div className="flex items-center justify-between border border-[#C9A227] bg-[#C9A227]/5 px-4 py-3">
                    <span className="velora-label text-[#C9A227]">{coupon.code} {t("cart.applied")}</span>
                    <button onClick={handleRemoveCoupon} className="text-[#C9A227] hover:opacity-70 transition-opacity">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-0">
                    <Input
                      placeholder={t("cart.enterCode")}
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                      className="rounded-none border-border bg-background h-12 text-sm uppercase tracking-widest focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary border-r-0"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-6 bg-foreground text-background h-12 velora-label text-xs hover:bg-[#C9A227] transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? "..." : t("btn.apply")}
                    </button>
                  </div>
                )}
                {couponError && <p className="velora-label text-destructive mt-3">{couponError}</p>}
              </div>

              {/* Totals */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.subtotal")}</span>
                  <span className="font-medium">{subtotal.toLocaleString()} EGP</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-destructive">
                    <span className="uppercase tracking-widest text-[10px]">{t("common.discount")}</span>
                    <span>−{discount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.shipping")}</span>
                  <span className="velora-label text-[#C9A227]">{t("common.free")}</span>
                </div>
              </div>

              <div className="border-t border-border pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="velora-label text-foreground">{t("common.total")}</span>
                  <span className="font-serif text-3xl font-bold">{total.toLocaleString()} EGP</span>
                </div>
              </div>

              {user ? (
                <button
                  className="velora-btn-primary w-full h-14 justify-center"
                  onClick={() => setLocation(checkoutUrl)}
                >
                  {t("btn.proceedToCheckout")}
                </button>
              ) : (
                <Link href="/login" className="velora-btn-primary w-full h-14 justify-center">
                  {t("btn.loginToCheckout")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
