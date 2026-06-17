import { useState } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAddToWishlist, useRemoveFromWishlist, useAddToCart, getGetWishlistQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useToast } from "@/hooks/use-toast";
import { useCartDrawer } from "@/contexts/CartDrawerContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchWishlist(): Promise<{ productId: number }[]> {
  const token = localStorage.getItem("auth_token");
  if (!token) return [];
  const res = await fetch(`${BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json() as Promise<{ productId: number }[]>;
}

export interface ProductCardProps {
  id: number;
  nameEn: string;
  nameAr: string | null;
  price: string | number;
  salePrice?: string | number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  variants?: { id: number; color: string | null; size: string | null; stockQuantity: number }[];
  averageRating?: number | null;
  reviewCount?: number | null;
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-secondary mb-3" />
      <div className="h-3 bg-secondary w-3/4 mb-2" />
      <div className="h-3 bg-secondary w-1/4" />
    </div>
  );
}

export default function ProductCard({ id, nameEn, nameAr, price, salePrice, imageUrl, variants, averageRating, reviewCount }: ProductCardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const guestCart = useGuestCart();
  const { openCart } = useCartDrawer();
  const [isHovered, setIsHovered] = useState(false);

  const { data: wishlist } = useQuery({
    queryKey: getGetWishlistQueryKey(),
    queryFn: fetchWishlist,
    enabled: !!user,
    staleTime: 60_000,
  });

  const addWishlistMutation = useAddToWishlist();
  const removeWishlistMutation = useRemoveFromWishlist();
  const addToCartMutation = useAddToCart();

  const isWishlisted = !!wishlist?.some(w => w.productId === id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast({ title: t("product.signInToSave") }); return; }
    const wKey = getGetWishlistQueryKey();
    if (isWishlisted) {
      const prev = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) => old ? old.filter(w => w.productId !== id) : []);
      removeWishlistMutation.mutate({ productId: id }, {
        onError: () => qc.setQueryData(wKey, prev),
        onSuccess: () => toast({ title: t("product.removedFromWishlist") }),
        onSettled: () => qc.invalidateQueries({ queryKey: wKey }),
      });
    } else {
      const prev = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) => old ? [...old, { productId: id }] : [{ productId: id }]);
      addWishlistMutation.mutate({ productId: id }, {
        onError: () => qc.setQueryData(wKey, prev),
        onSuccess: () => toast({ title: t("product.savedToWishlist") }),
        onSettled: () => qc.invalidateQueries({ queryKey: wKey }),
      });
    }
  };

  const canQuickAdd = variants && variants.length === 1 && variants[0].stockQuantity > 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canQuickAdd) return;
    const v = variants![0];
    if (user) {
      const cartKey = getGetCartQueryKey();
      qc.cancelQueries({ queryKey: cartKey });
      const prev = qc.getQueryData(cartKey);
      qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
        if (!old) return old;
        const existing = old.items.find(i => i.variantId === v.id);
        const items = existing
          ? old.items.map(i => i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i)
          : [...old.items, { variantId: v.id, quantity: 1, price, salePrice: salePrice ?? null, nameEn, nameAr: nameAr ?? nameEn, imageUrl: imageUrl ?? null, color: null, size: null }];
        return { ...old, items, subtotal: items.reduce((a, i) => a + Number(i.salePrice || i.price) * i.quantity, 0) };
      });
      addToCartMutation.mutate({ data: { variantId: v.id, quantity: 1 } }, {
        onError: () => qc.setQueryData(cartKey, prev),
        onSuccess: () => { toast({ title: t("product.addedToCart") }); openCart(); },
        onSettled: () => qc.invalidateQueries({ queryKey: cartKey }),
      });
    } else {
      guestCart.addItem({ variantId: v.id, productId: id, nameEn, nameAr: nameAr ?? nameEn, imageUrl: imageUrl ?? null, price: Number(price), salePrice: salePrice ? Number(salePrice) : null, color: v.color, size: v.size, stockQuantity: v.stockQuantity, quantity: 1 });
      toast({ title: t("product.addedToCart") });
      openCart();
    }
  };

  const displayName = language === "en" ? nameEn : (nameAr || nameEn);
  const displayPrice = Number(price).toLocaleString();
  const displaySalePrice = salePrice ? Number(salePrice).toLocaleString() : null;
  const savePct = salePrice ? Math.round((1 - Number(salePrice) / Number(price)) * 100) : null;
  const hasRating = typeof averageRating === "number" && averageRating > 0 && typeof reviewCount === "number" && reviewCount > 0;

  return (
    <Link href={`/products/${id}`} className="group block">
      <div
        className="relative aspect-[3/4] overflow-hidden bg-secondary mb-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] font-medium tracking-widest uppercase text-foreground/20">{t("product.noImage")}</span>
          </div>
        )}

        {/* Hover tint */}
        <div className={`absolute inset-0 bg-black/8 transition-opacity duration-500 ${isHovered ? "opacity-100" : "opacity-0"}`} />

        {/* Sale badge */}
        {savePct && (
          <div className="absolute top-3 left-3 bg-[#111111] text-white text-[9px] font-bold px-2.5 py-1 tracking-[0.18em] uppercase">
            −{savePct}%
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-8 h-8 bg-white flex items-center justify-center shadow-sm hover:scale-110 transition-all duration-200 ${
            isHovered || isWishlisted ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-foreground"}`} />
        </button>

        {/* Quick add */}
        {canQuickAdd && (
          <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <button
              onClick={handleQuickAdd}
              className="w-full bg-white text-[#111111] text-[9px] font-bold tracking-[0.2em] uppercase py-3.5 flex items-center justify-center gap-2 hover:bg-[#111111] hover:text-white transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {t("btn.quickAdd")}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1 px-0.5">
        <h3 className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-foreground/60 transition-colors">
          {displayName}
        </h3>
        {hasRating && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <span key={i} className={`text-[10px] ${i <= Math.round(averageRating!) ? "text-[#C9A227]" : "text-foreground/15"}`}>★</span>
              ))}
            </div>
            <span className="text-[10px] text-foreground/35">({reviewCount})</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          {displaySalePrice ? (
            <>
              <span className="font-semibold text-[#111111]">{displaySalePrice} EGP</span>
              <span className="line-through text-foreground/30 text-xs">{displayPrice} EGP</span>
            </>
          ) : (
            <span className="font-semibold">{displayPrice} EGP</span>
          )}
        </div>
      </div>
    </Link>
  );
}
