import { useState } from "react";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAddToWishlist, useRemoveFromWishlist, useAddToCart, getGetWishlistQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useToast } from "@/hooks/use-toast";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import QuickViewModal from "@/components/product/QuickViewModal";
import { ProductBadge, computeBadge } from "@/components/product/ProductBadge";

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
  featured?: boolean;
  createdAt?: string;
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-secondary mb-4" />
      <div className="h-2.5 bg-secondary w-2/3 mb-2.5" />
      <div className="h-2.5 bg-secondary w-1/4" />
    </div>
  );
}

export default function ProductCard({ id, nameEn, nameAr, price, salePrice, imageUrl, variants, averageRating, reviewCount, featured, createdAt }: ProductCardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const guestCart = useGuestCart();
  const { openCart } = useCartDrawer();
  const [hovered, setHovered] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

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

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  const displayName = language === "en" ? nameEn : (nameAr || nameEn);
  const displayPrice = Number(price).toLocaleString();
  const displaySalePrice = salePrice ? Number(salePrice).toLocaleString() : null;
  const savePct = salePrice ? Math.round((1 - Number(salePrice) / Number(price)) * 100) : null;
  const hasRating = typeof averageRating === "number" && averageRating > 0 && typeof reviewCount === "number" && reviewCount > 0;

  const totalStock = variants ? variants.reduce((s, v) => s + v.stockQuantity, 0) : undefined;
  const badge = computeBadge({ createdAt: createdAt ?? new Date(0).toISOString(), salePrice, totalStock, featured });
  const hasVariants = variants && variants.length > 0;

  return (
    <>
      <Link href={`/products/${id}`} className="group block h-full">
        <div
          className="relative overflow-hidden bg-background mb-4"
          style={{ aspectRatio: "3/4" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="velora-label opacity-20">{t("product.noImage")}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            {savePct && (
              <span className="bg-primary text-primary-foreground text-[8px] font-bold px-2 py-1 tracking-[0.2em] uppercase">
                −{savePct}%
              </span>
            )}
            {badge && badge !== "sale" && <ProductBadge type={badge} />}
          </div>

          {/* Wishlist — always visible on mobile, hover on desktop */}
          <button
            onClick={handleWishlist}
            className={`absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300 md:opacity-0 md:pointer-events-none ${
              hovered || isWishlisted ? "md:opacity-100 md:pointer-events-auto" : ""
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-primary text-primary" : "text-foreground"}`} strokeWidth={1.5} />
          </button>

          {/* Bottom CTA — Quick Add or Quick View */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out ${hovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
          >
            {canQuickAdd ? (
              <button
                onClick={handleQuickAdd}
                className="w-full bg-primary text-primary-foreground text-[9px] font-bold tracking-[0.3em] uppercase py-4 hover:bg-primary/90 transition-colors duration-300"
              >
                {t("btn.quickAdd")}
              </button>
            ) : hasVariants ? (
              <button
                onClick={handleQuickView}
                className="w-full bg-primary text-primary-foreground text-[9px] font-bold tracking-[0.3em] uppercase py-4 hover:bg-primary/90 transition-colors duration-300"
              >
                Quick View
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-start gap-4">
            <h3
              className="text-lg font-serif italic text-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-1"
            >
              {displayName}
            </h3>
          </div>
          
          {hasRating && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`text-[10px] ${i <= Math.round(averageRating!) ? "text-accent" : "text-border"}`}>★</span>
              ))}
              <span className="text-[9px] text-muted-foreground tracking-widest ml-1 font-bold">({reviewCount})</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {displaySalePrice ? (
              <>
                <span className="text-base font-medium text-accent tracking-tight">{displaySalePrice} EGP</span>
                <span className="line-through text-xs text-muted-foreground/60 tracking-tight font-light">{displayPrice} EGP</span>
              </>
            ) : (
              <span className="text-base font-medium text-foreground tracking-tight">{displayPrice} EGP</span>
            )}
          </div>
        </div>
      </Link>

      {showQuickView && (
        <QuickViewModal
          product={{ id, nameEn, nameAr, price, salePrice, images: imageUrl ? [{ id: 0, imageUrl, isPrimary: true, sortOrder: 0 }] : [], variants }}
          onClose={() => setShowQuickView(false)}
        />
      )}
    </>
  );
}
