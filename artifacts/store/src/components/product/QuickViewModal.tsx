import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, Heart, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAddToCart, useAddToWishlist, useRemoveFromWishlist, getGetWishlistQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import VariantSwatches from "./VariantSwatches";
import SizeSelector from "./SizeSelector";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchWishlist(): Promise<{ productId: number }[]> {
  const token = localStorage.getItem("auth_token");
  if (!token) return [];
  const res = await fetch(`${BASE}/api/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json() as Promise<{ productId: number }[]>;
}

export interface QuickViewProduct {
  id: number;
  nameEn: string;
  nameAr: string | null;
  price: string | number;
  salePrice?: string | number | null;
  images?: { id: number; imageUrl: string; isPrimary: boolean; sortOrder: number }[];
  variants?: { id: number; color: string | null; size: string | null; stockQuantity: number }[];
}

interface QuickViewModalProps {
  product: QuickViewProduct;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const guestCart = useGuestCart();
  const { openCart } = useCartDrawer();

  const variants = product.variants ?? [];
  const colors = [...new Set(variants.map(v => v.color).filter((c): c is string => !!c))];
  const sizes  = [...new Set(variants.map(v => v.size).filter((s): s is string => !!s))];

  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [selectedSize, setSelectedSize]   = useState("");

  const primaryImage = product.images?.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.imageUrl;

  const addToCartMutation = useAddToCart();
  const addWishlistMutation = useAddToWishlist();
  const removeWishlistMutation = useRemoveFromWishlist();

  const { data: wishlist } = useQuery({
    queryKey: getGetWishlistQueryKey(),
    queryFn: fetchWishlist,
    enabled: !!user,
    staleTime: 60_000,
  });
  const isWishlisted = !!wishlist?.some(w => w.productId === product.id);

  const matchingVariant = variants.find(v =>
    (!selectedColor || v.color === selectedColor) &&
    (!selectedSize  || v.size  === selectedSize)
  );

  const isOutOfStock = matchingVariant ? matchingVariant.stockQuantity === 0 :
    variants.every(v => v.stockQuantity === 0);

  const canAdd = !!matchingVariant && !isOutOfStock;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const displayName = language === "en" ? product.nameEn : (product.nameAr || product.nameEn);
  const displayPrice = Number(product.price).toLocaleString();
  const displaySalePrice = product.salePrice ? Number(product.salePrice).toLocaleString() : null;
  const savePct = product.salePrice ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!matchingVariant) return;
    const v = matchingVariant;
    if (user) {
      const cartKey = getGetCartQueryKey();
      addToCartMutation.mutate({ data: { variantId: v.id, quantity: 1 } }, {
        onSuccess: () => { toast({ title: t("product.addedToCart") }); openCart(); onClose(); },
        onSettled: () => qc.invalidateQueries({ queryKey: cartKey }),
      });
    } else {
      guestCart.addItem({ variantId: v.id, productId: product.id, nameEn: product.nameEn, nameAr: product.nameAr ?? product.nameEn, imageUrl: primaryImage ?? null, price: Number(product.price), salePrice: product.salePrice ? Number(product.salePrice) : null, color: v.color, size: v.size, stockQuantity: v.stockQuantity, quantity: 1 });
      toast({ title: t("product.addedToCart") }); openCart(); onClose();
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: t("product.signInToSave") }); return; }
    const wKey = getGetWishlistQueryKey();
    if (isWishlisted) {
      removeWishlistMutation.mutate({ productId: product.id }, {
        onSuccess: () => toast({ title: t("product.removedFromWishlist") }),
        onSettled: () => qc.invalidateQueries({ queryKey: wKey }),
      });
    } else {
      addWishlistMutation.mutate({ productId: product.id }, {
        onSuccess: () => toast({ title: t("product.savedToWishlist") }),
        onSettled: () => qc.invalidateQueries({ queryKey: wKey }),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[90vh]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-background/80 hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <div className="relative bg-secondary sm:w-52 shrink-0" style={{ aspectRatio: "3/4" }}>
          {primaryImage ? (
            <img src={primaryImage} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">No Image</div>
          )}
          {savePct && (
            <div className="absolute top-3 left-3 bg-foreground text-background text-[8px] font-bold px-2 py-1 tracking-[0.22em] uppercase">
              −{savePct}%
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-6 overflow-y-auto">
          <p className="text-[8px] font-bold tracking-[0.35em] uppercase text-foreground/25 mb-2">Quick View</p>
          <h2
            className="text-xl font-bold text-foreground mb-1 leading-snug"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {displayName}
          </h2>

          <div className="flex items-baseline gap-3 mb-6 mt-3">
            {displaySalePrice ? (
              <>
                <span className="text-lg font-bold text-[#C9A227]">{displaySalePrice} EGP</span>
                <span className="text-sm line-through text-foreground/30">{displayPrice} EGP</span>
              </>
            ) : (
              <span className="text-lg font-bold text-foreground">{displayPrice} EGP</span>
            )}
          </div>

          <div className="space-y-5">
            {colors.length > 0 && (
              <VariantSwatches
                colors={colors}
                selected={selectedColor}
                onSelect={setSelectedColor}
              />
            )}

            {sizes.length > 0 && (
              <SizeSelector
                sizes={sizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
                variants={variants.map(v => ({ size: v.size ?? "", color: v.color, stockQuantity: v.stockQuantity }))}
                selectedColor={selectedColor}
              />
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddToCart}
              disabled={!canAdd || addToCartMutation.isPending}
              className="flex-1 py-3.5 bg-foreground text-background text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isOutOfStock ? "Out of Stock" : addToCartMutation.isPending ? "..." : t("btn.addToCart")}
            </button>

            <button
              onClick={handleWishlist}
              className={`w-12 flex items-center justify-center border transition-colors ${isWishlisted ? "border-red-200 bg-red-50" : "border-border hover:border-foreground/40"}`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : "text-foreground/40"}`} />
            </button>
          </div>

          <Link
            href={`/products/${product.id}`}
            onClick={onClose}
            className="mt-4 flex items-center gap-1.5 text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/40 hover:text-foreground transition-colors"
          >
            View Full Details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
