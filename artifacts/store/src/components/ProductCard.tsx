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
      <Link href={`/products/${id}`} className="group block">
        <div
          className="relative overflow-hidden bg-secondary dark:bg-[#1C1C1C] mb-4"
          style={{ aspectRatio: "2/3" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/20">{t("product.noImage")}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            {savePct && (
              <span className="bg-foreground text-background text-[8px] font-bold px-2 py-1 tracking-[0.22em] uppercase">
                −{savePct}%
              </span>
            )}
            {badge && badge !== "sale" && <ProductBadge type={badge} />}
          </div>

          {/* Wishlist — always visible on mobile, hover on desktop */}
          <button
            onClick={handleWishlist}
            className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-background transition-all duration-200 md:opacity-0 md:pointer-events-none ${
              hovered || isWishlisted ? "md:opacity-100 md:pointer-events-auto" : ""
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`w-3.5 h-3.5 transition-colors ${isWishlisted ? "fill-foreground text-foreground" : "text-foreground"}`} />
          </button>

          {/* Bottom CTA — Quick Add or Quick View */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${hovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
          >
            {canQuickAdd ? (
              <button
                onClick={handleQuickAdd}
                className="w-full bg-foreground text-background text-[8px] font-bold tracking-[0.28em] uppercase py-3.5 hover:bg-[#C9A227] hover:text-white transition-colors duration-200"
              >
                {t("btn.quickAdd")}
              </button>
            ) : hasVariants ? (
              <button
                onClick={handleQuickView}
                className="w-full bg-foreground text-background text-[8px] font-bold tracking-[0.28em] uppercase py-3.5 hover:bg-[#C9A227] hover:text-white transition-colors duration-200"
              >
                Quick View
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3
            className="text-sm font-medium leading-snug tracking-wide text-foreground line-clamp-1 group-hover:opacity-60 transition-opacity duration-300"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {displayName}
          </h3>
          {hasRating && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`text-[9px] ${i <= Math.round(averageRating!) ? "text-[#C9A227]" : "text-foreground/15"}`}>★</span>
              ))}
              <span className="text-[9px] text-foreground/30 tracking-wide">({reviewCount})</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {displaySalePrice ? (
              <>
                <span className="text-sm font-semibold text-[#C9A227] tracking-wide">{displaySalePrice} EGP</span>
                <span className="line-through text-xs text-foreground/30 tracking-wide">{displayPrice} EGP</span>
              </>
            ) : (
              <span className="text-sm font-medium text-foreground tracking-wide">{displayPrice} EGP</span>
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
