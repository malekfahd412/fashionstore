import { useState } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAddToWishlist, useRemoveFromWishlist, useAddToCart, getGetWishlistQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchWishlist(): Promise<{ productId: number }[]> {
  const token = localStorage.getItem("auth_token");
  if (!token) return [];
  const res = await fetch(`${BASE}/api/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data as { productId: number }[];
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
      <div className="aspect-[3/4] bg-muted mb-4" />
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-4 bg-muted rounded w-1/3" />
    </div>
  );
}

export default function ProductCard({ id, nameEn, nameAr, price, salePrice, imageUrl, variants, averageRating, reviewCount }: ProductCardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const guestCart = useGuestCart();
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
    if (!user) {
      toast({ title: t("product.signInToSave") });
      return;
    }
    const wKey = getGetWishlistQueryKey();
    if (isWishlisted) {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) =>
        old ? old.filter(w => w.productId !== id) : []
      );
      removeWishlistMutation.mutate({ productId: id }, {
        onError: () => { qc.setQueryData(wKey, previous); },
        onSuccess: () => toast({ title: t("product.removedFromWishlist") }),
        onSettled: () => { qc.invalidateQueries({ queryKey: wKey }); },
      });
    } else {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) =>
        old ? [...old, { productId: id }] : [{ productId: id }]
      );
      addWishlistMutation.mutate({ productId: id }, {
        onError: () => { qc.setQueryData(wKey, previous); },
        onSuccess: () => toast({ title: t("product.savedToWishlist") }),
        onSettled: () => { qc.invalidateQueries({ queryKey: wKey }); },
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
      addToCartMutation.mutate({ data: { variantId: v.id, quantity: 1 } }, {
        onSuccess: () => {
          toast({ title: t("product.addedToCart") });
          qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        },
      });
    } else {
      guestCart.addItem({
        variantId: v.id,
        productId: id,
        nameEn,
        nameAr: nameAr ?? nameEn,
        imageUrl: imageUrl ?? null,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : null,
        color: v.color,
        size: v.size,
        stockQuantity: v.stockQuantity,
        quantity: 1,
      });
      toast({ title: t("product.addedToCart") });
    }
  };

  const displayName = language === "en" ? nameEn : (nameAr || nameEn);
  const displayPrice = Number(price).toLocaleString();
  const displaySalePrice = salePrice ? Number(salePrice).toLocaleString() : null;
  const savePct = salePrice
    ? Math.round((1 - Number(salePrice) / Number(price)) * 100)
    : null;

  const hasRating = typeof averageRating === "number" && averageRating > 0 && typeof reviewCount === "number" && reviewCount > 0;

  return (
    <Link href={`/products/${id}`} className="group block">
      <div
        className="relative aspect-[3/4] overflow-hidden bg-muted mb-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">{t("product.noImage")}</div>
        )}

        {/* Sale badge */}
        {savePct && (
          <div className="absolute top-2 left-2 bg-destructive text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
            -{savePct}%
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white shadow-sm transition-all duration-200 ${
            isHovered || isWishlisted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
          aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-destructive text-destructive" : "text-foreground"}`}
          />
        </button>

        {/* Quick add (single-variant only) */}
        {canQuickAdd && (
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <button
              onClick={handleQuickAdd}
              className="w-full bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest py-3 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {t("btn.quickAdd")}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {displayName}
        </h3>
        {hasRating && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i <= Math.round(averageRating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {averageRating!.toFixed(1)} ({reviewCount})
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          {displaySalePrice ? (
            <>
              <span className="font-bold text-destructive">{displaySalePrice} EGP</span>
              <span className="line-through text-muted-foreground text-xs">{displayPrice} EGP</span>
            </>
          ) : (
            <span className="font-bold">{displayPrice} EGP</span>
          )}
        </div>
      </div>
    </Link>
  );
}
