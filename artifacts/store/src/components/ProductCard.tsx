import { useState } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag, Star } from "lucide-react";
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
      <div className="aspect-[3/4] bg-muted mb-4 overflow-hidden" />
      <div className="h-4 bg-muted rounded-none w-3/4 mb-2" />
      <div className="h-4 bg-muted rounded-none w-1/3" />
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
      const cartKey = getGetCartQueryKey();
      qc.cancelQueries({ queryKey: cartKey });
      const previous = qc.getQueryData(cartKey);
      qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
        if (!old) return old;
        const existing = old.items.find(i => i.variantId === v.id);
        const items = existing
          ? old.items.map(i => i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i)
          : [...old.items, { variantId: v.id, quantity: 1, price, salePrice: salePrice ?? null, nameEn, nameAr: nameAr ?? nameEn, imageUrl: imageUrl ?? null, color: null, size: null }];
        const subtotal = items.reduce((acc, i) => acc + (Number(i.salePrice || i.price) * i.quantity), 0);
        return { ...old, items, subtotal };
      });
      addToCartMutation.mutate({ data: { variantId: v.id, quantity: 1 } }, {
        onError: () => { qc.setQueryData(cartKey, previous); },
        onSuccess: () => {
          toast({ title: t("product.addedToCart") });
          openCart();
        },
        onSettled: () => { qc.invalidateQueries({ queryKey: cartKey }); },
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
      openCart();
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
        className="relative aspect-[3/4] overflow-hidden bg-muted mb-4"
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
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bg-muted/50">{t("product.noImage")}</div>
        )}
        
        <div className={`absolute inset-0 bg-black/10 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

        {savePct && (
          <div className="absolute top-3 left-3 bg-destructive text-white text-[11px] font-bold px-3 py-1 uppercase tracking-widest shadow-sm">
            SALE {savePct}%
          </div>
        )}

        <button
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-md hover:scale-110 transition-all duration-300 ${
            isHovered || isWishlisted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
          }`}
          aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-300 ${isWishlisted ? "fill-red-500 text-red-500 scale-110" : "text-foreground"}`}
          />
        </button>

        {canQuickAdd && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <button
              onClick={handleQuickAdd}
              className="w-full bg-background/95 backdrop-blur text-foreground text-xs font-bold uppercase tracking-widest py-3.5 flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              {t("btn.quickAdd")}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1.5 px-1">
        <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
          {displayName}
        </h3>
        
        {hasRating && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i <= Math.round(averageRating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">
              ({reviewCount})
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-3 text-sm mt-1">
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