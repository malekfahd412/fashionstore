import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProduct, useGetRelatedProducts, useAddToCart, useAddToWishlist, useRemoveFromWishlist, useGetWishlist,
  useCreateReview, useUpdateReview, useDeleteReview,
  getGetProductQueryKey, getGetRelatedProductsQueryKey, getGetWishlistQueryKey, getGetCartQueryKey,
  getGetMyReviewsQueryKey, getAdminListReviewsQueryKey,
} from "@workspace/api-client-react";
import type { ProductReviewsResponse } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCartDrawer } from "@/contexts/CartDrawerContext";

import { Heart, Truck, RotateCcw, ShieldCheck, ZoomIn, ChevronLeft, ChevronRight, Star, PenLine, Trash2, CheckCircle2, X, Bell } from "lucide-react";
import ProductCard from "@/components/ProductCard";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchReviews(productId: number, sort: string, page: number, limit: number): Promise<ProductReviewsResponse> {
  const token = localStorage.getItem("auth_token");
  const qs = new URLSearchParams({ sort, page: String(page), limit: String(limit) });
  const res = await fetch(`${BASE}/api/products/${productId}/reviews?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load reviews");
  return res.json() as Promise<ProductReviewsResponse>;
}

function StarRating({ value, onChange, readonly = false, size = "md" }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean; size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`${sz} transition-colors ${
              i <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, currentUserId, onEdit, onDelete }: {
  review: { id: number; userName?: string; rating: number; title?: string | null; comment?: string | null; verifiedPurchase: boolean; createdAt: string; userId: number };
  currentUserId?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const isOwn = currentUserId === review.userId;
  return (
    <div className="border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{review.userName ?? t("product.anonymous")}</span>
            {review.verifiedPurchase && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {t("reviews.verifiedPurchase")}
              </span>
            )}
          </div>
          <StarRating value={review.rating} readonly size="sm" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {isOwn && (
            <>
              <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><PenLine className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>
      {review.title && <p className="font-semibold text-sm">{review.title}</p>}
      {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const productId = Number(id);
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const guestCart = useGuestCart();
  const qc = useQueryClient();
  const { openCart } = useCartDrawer();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewPage, setReviewPage] = useState(1);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<{ id: number; rating: number; title: string; comment: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: "", comment: "" });

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  useSEO({
    title: product ? (language === "en" ? product.nameEn : product.nameAr) : undefined,
    description: product?.descriptionEn?.slice(0, 155) || undefined,
  });
  const { data: relatedProducts } = useGetRelatedProducts(productId, {
    query: { enabled: !!productId, queryKey: getGetRelatedProductsQueryKey(productId) },
  });
  const { data: wishlist } = useGetWishlist({
    query: { enabled: !!user, queryKey: getGetWishlistQueryKey() },
  });
  const reviewsQueryKey = ["product-reviews", productId, reviewSort, reviewPage];
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: reviewsQueryKey,
    queryFn: () => fetchReviews(productId, reviewSort, reviewPage, 10),
    enabled: !!productId,
  });

  const addToCartMutation = useAddToCart();
  const addWishlistMutation = useAddToWishlist();
  const removeWishlistMutation = useRemoveFromWishlist();
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const deleteReviewMutation = useDeleteReview();

  const invalidateReviews = () => {
    qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    qc.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
    qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
  };

  const openWriteReview = () => {
    setReviewForm({ rating: 0, title: "", comment: "" });
    setEditingReview(null);
    setShowReviewModal(true);
  };
  const openEditReview = (r: { id: number; rating: number; title?: string | null; comment?: string | null }) => {
    setEditingReview({ id: r.id, rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
    setReviewForm({ rating: r.rating, title: r.title ?? "", comment: r.comment ?? "" });
    setShowReviewModal(true);
  };
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewForm.rating === 0) { toast({ title: t("reviews.pleaseRate"), variant: "destructive" }); return; }
    if (reviewForm.comment.length < 10) { toast({ title: t("reviews.commentMin"), variant: "destructive" }); return; }

    if (editingReview) {
      updateReviewMutation.mutate(
        { id: editingReview.id, data: { rating: reviewForm.rating, title: reviewForm.title || undefined, comment: reviewForm.comment } },
        { onSuccess: () => { toast({ title: t("reviews.updated") }); setShowReviewModal(false); invalidateReviews(); } }
      );
    } else {
      createReviewMutation.mutate(
        { id: productId, data: { rating: reviewForm.rating, title: reviewForm.title || undefined, comment: reviewForm.comment } },
        { onSuccess: () => { toast({ title: t("reviews.submitted") }); setShowReviewModal(false); invalidateReviews(); } }
      );
    }
  };
  const handleDeleteReview = (reviewId: number) => {
    deleteReviewMutation.mutate({ id: reviewId }, {
      onSuccess: () => { toast({ title: t("reviews.deleted") }); invalidateReviews(); },
    });
  };

  const isWishlisted = !!wishlist?.some(w => w.productId === productId);

  useEffect(() => {
    if (product?.images?.[0] && !activeImage) {
      setActiveImage(product.images[0].imageUrl);
      setActiveImageIdx(0);
    }
  }, [product]);

  // Track recently viewed (non-blocking, only for logged-in users)
  useEffect(() => {
    if (user && productId) {
      const token = localStorage.getItem("auth_token");
      fetch(`${BASE}/api/recently-viewed/${productId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [user, productId]);

  const handleImageSelect = (url: string, idx: number) => {
    setActiveImage(url);
    setActiveImageIdx(idx);
  };

  const handlePrevImage = () => {
    if (!product?.images) return;
    const idx = (activeImageIdx - 1 + product.images.length) % product.images.length;
    handleImageSelect(product.images[idx].imageUrl, idx);
  };

  const handleNextImage = () => {
    if (!product?.images) return;
    const idx = (activeImageIdx + 1) % product.images.length;
    handleImageSelect(product.images[idx].imageUrl, idx);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  const colors = [...new Set((product?.variants || []).map(v => v.color))].filter(Boolean) as string[];
  const sizes = [...new Set((product?.variants || []).map(v => v.size))].filter(Boolean) as string[];
  const availableSizesForColor = selectedColor
    ? new Set((product?.variants || []).filter(v => v.color === selectedColor).map(v => v.size))
    : null;
  const selectedVariant = product?.variants?.find(v => v.color === selectedColor && v.size === selectedSize);
  const notifyVariantId = selectedVariant?.id;
  const { data: notifyStatus, refetch: refetchNotifyStatus } = useQuery({
    queryKey: ["notify-status", notifyVariantId],
    queryFn: async () => {
      if (!notifyVariantId) return { subscribed: false };
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/products/variants/${notifyVariantId}/notify`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { subscribed: false };
      return res.json() as Promise<{ subscribed: boolean }>;
    },
    enabled: !!user && !!notifyVariantId,
  });
  const isSubscribed = notifyStatus?.subscribed ?? false;
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/products/variants/${notifyVariantId}/notify`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to subscribe");
    },
    onSuccess: () => {
      void refetchNotifyStatus();
      toast({ title: "You'll be notified when this item is back in stock!" });
    },
  });
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/products/variants/${notifyVariantId}/notify`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
    },
    onSuccess: () => {
      void refetchNotifyStatus();
      toast({ title: "Stock notification removed" });
    },
  });

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedSize && availableSizesForColor && !availableSizesForColor.has(selectedSize)) {
      setSelectedSize("");
    }
  };

  const handleAddToCart = () => {
    if (!selectedColor && colors.length > 0) {
      toast({ title: t("product.selectColor"), variant: "destructive" }); return;
    }
    if (!selectedSize && sizes.length > 0) {
      toast({ title: t("product.selectSize"), variant: "destructive" }); return;
    }
    if ((colors.length > 0 || sizes.length > 0) && !selectedVariant) {
      toast({ title: t("product.unavailable"), variant: "destructive" }); return;
    }
    const variantId = selectedVariant?.id ?? product?.variants?.[0]?.id;
    if (!variantId || !product) return;

    if (!user) {
      guestCart.addItem({
        variantId,
        productId: product.id,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        imageUrl: product.images?.[0]?.imageUrl ?? null,
        price: Number(product.price),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        color: selectedVariant?.color ?? null,
        size: selectedVariant?.size ?? null,
        stockQuantity: selectedVariant?.stockQuantity ?? 0,
        quantity,
      });
      toast({ title: t("product.addedToCart") });
      openCart();
      return;
    }
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
      if (!old) return old;
      const existing = old.items.find(i => i.variantId === variantId);
      const items = existing
        ? old.items.map(i => i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i)
        : [...old.items, {
            variantId,
            quantity,
            price: Number(product.price),
            salePrice: product.salePrice ? Number(product.salePrice) : null,
            nameEn: product.nameEn,
            nameAr: product.nameAr,
            imageUrl: product.images?.[0]?.imageUrl ?? null,
            color: selectedVariant?.color ?? null,
            size: selectedVariant?.size ?? null,
          }];
      const subtotal = items.reduce((acc, i) => acc + (Number(i.salePrice || i.price) * i.quantity), 0);
      return { ...old, items, subtotal };
    });
    addToCartMutation.mutate({ data: { variantId, quantity } }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSuccess: () => {
        toast({ title: t("product.addedToCart") });
        openCart();
      },
      onSettled: () => { qc.invalidateQueries({ queryKey: cartKey }); },
    });
  };

  const handleWishlist = () => {
    if (!user) {
      toast({ title: t("product.signInToSave") }); return;
    }
    const wKey = getGetWishlistQueryKey();
    if (isWishlisted) {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) =>
        old ? old.filter(w => w.productId !== productId) : []
      );
      removeWishlistMutation.mutate({ productId }, {
        onError: () => { qc.setQueryData(wKey, previous); },
        onSuccess: () => toast({ title: t("product.removedFromWishlist") }),
        onSettled: () => { qc.invalidateQueries({ queryKey: wKey }); },
      });
    } else {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) =>
        old ? [...old, { productId }] : [{ productId }]
      );
      addWishlistMutation.mutate({ productId }, {
        onError: () => { qc.setQueryData(wKey, previous); },
        onSuccess: () => toast({ title: t("product.savedToWishlist") }),
        onSettled: () => { qc.invalidateQueries({ queryKey: wKey }); },
      });
    }
  };

  const needsSelection = colors.length > 0 || sizes.length > 0;
  const selectionComplete = (!colors.length || selectedColor) && (!sizes.length || selectedSize);
  const isOutOfStock = selectionComplete && selectedVariant !== undefined && selectedVariant.stockQuantity === 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="w-20 aspect-[3/4] bg-muted animate-pulse" />)}
            </div>
          </div>
          <div className="space-y-6 pt-4">
            <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-lg">
        <h2 className="font-serif text-4xl font-bold mb-6">{t("product.notFound")}</h2>
        <Button asChild className="uppercase tracking-widest rounded-none h-14" size="lg"><Link href="/products">{t("product.backToShop")}</Link></Button>
      </div>
    );
  }

  const displayPrice = Number(product.price).toLocaleString();
  const displaySalePrice = product.salePrice ? Number(product.salePrice).toLocaleString() : null;
  const savePct = product.salePrice
    ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)
    : null;
  const name = language === "en" ? product.nameEn : (product.nameAr || product.nameEn);
  const description = language === "en" ? product.descriptionEn : (product.descriptionAr || product.descriptionEn);

  return (
    <div className="container mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary transition-colors">{t("product.home")}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-primary transition-colors">{t("product.shop")}</Link>
        {product.categoryName && (
          <>
            <span>/</span>
            <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-primary transition-colors">{product.categoryName}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-24">
        {/* Gallery */}
        <div className="space-y-4">
          <div
            ref={imageRef}
            className={`aspect-[3/4] bg-muted w-full overflow-hidden relative cursor-zoom-in ${zoomed ? "cursor-zoom-out" : ""}`}
            onClick={() => setZoomed(v => !v)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoomed(false)}
          >
            {activeImage ? (
              <img
                src={activeImage}
                alt={name ?? ""}
                className="w-full h-full object-cover transition-transform duration-300"
                style={
                  zoomed
                    ? {
                        transform: "scale(2.5)",
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transition: "transform 0.1s ease",
                      }
                    : {}
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest">{t("product.noImage")}</div>
            )}

            {!zoomed && activeImage && (
              <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur text-foreground text-xs uppercase tracking-widest px-3 py-1.5 flex items-center gap-2 shadow-sm">
                <ZoomIn className="w-4 h-4" /> {t("product.zoomHint")}
              </div>
            )}

            {savePct && (
              <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 uppercase tracking-widest shadow-sm">
                SALE {savePct}%
              </div>
            )}

            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => handleImageSelect(img.imageUrl, idx)}
                  className={`w-24 aspect-[3/4] bg-muted shrink-0 overflow-hidden transition-all duration-300 relative ${
                    activeImageIdx === idx ? "opacity-100 ring-1 ring-primary ring-offset-2" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col pt-2 lg:pt-8">
          {product.categoryName && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{product.categoryName}</p>
          )}

          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight">{name}</h1>

          {/* Rating */}
          {reviewsData && reviewsData.stats.totalReviews > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly size="sm" />
              <span className="text-sm text-muted-foreground underline decoration-muted-foreground/30 hover:decoration-foreground transition-colors cursor-pointer" onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}>
                {reviewsData.stats.totalReviews} {t("reviews.total")}
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-4 mb-8">
            {displaySalePrice ? (
              <>
                <span className="text-3xl font-bold text-destructive">{displaySalePrice} EGP</span>
                <span className="text-xl line-through text-muted-foreground">{displayPrice} EGP</span>
              </>
            ) : (
              <span className="text-3xl font-bold">{displayPrice} EGP</span>
            )}
          </div>

          {description && (
            <div className="prose prose-sm md:prose-base prose-neutral dark:prose-invert mb-10 max-w-none text-muted-foreground">
              <p className="leading-relaxed">{description}</p>
            </div>
          )}

          <div className="space-y-8 mb-10 flex-1">
            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest">{t("common.color")}</h3>
                  {selectedColor && <span className="text-sm text-muted-foreground">{selectedColor}</span>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                        selectedColor === color
                          ? "border-primary ring-1 ring-primary ring-offset-2 scale-110"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.toLowerCase() }}
                      title={color}
                    >
                      <span className="sr-only">{color}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest">{t("common.size")}</h3>
                  <button className="text-xs underline text-muted-foreground hover:text-foreground transition-colors">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(size => {
                    const unavailable = availableSizesForColor !== null && !availableSizesForColor.has(size);
                    return (
                      <button
                        key={size}
                        disabled={unavailable}
                        onClick={() => !unavailable && setSelectedSize(size)}
                        className={`min-w-[3rem] h-12 px-4 flex items-center justify-center border text-sm font-medium transition-all relative ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : unavailable
                            ? "border-border text-muted-foreground/30 cursor-not-allowed bg-muted/20"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        {size}
                        {unavailable && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full h-[1px] bg-border rotate-45 transform origin-center absolute" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4">{t("common.quantity")}</h3>
              <div className="flex items-center border border-border w-36 h-12">
                <button className="w-12 h-full hover:bg-muted transition-colors flex items-center justify-center" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <div className="flex-1 h-full flex items-center justify-center font-medium text-sm">{quantity}</div>
                <button className="w-12 h-full hover:bg-muted transition-colors flex items-center justify-center" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-4 mb-10">
            {isOutOfStock ? (
              user ? (
                isSubscribed ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-14 text-sm rounded-none uppercase tracking-widest border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => unsubscribeMutation.mutate()}
                    disabled={unsubscribeMutation.isPending}
                  >
                    <Bell className="w-4 h-4 mr-2 fill-emerald-600" />
                    {unsubscribeMutation.isPending ? "..." : "Notified ✓"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-14 text-sm rounded-none uppercase tracking-widest"
                    onClick={() => subscribeMutation.mutate()}
                    disabled={subscribeMutation.isPending || !notifyVariantId}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {subscribeMutation.isPending ? "Saving..." : "Notify Me When Back"}
                  </Button>
                )
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-14 text-sm rounded-none uppercase tracking-widest opacity-50 cursor-not-allowed"
                  disabled
                >
                  Out of Stock
                </Button>
              )
            ) : (
              <Button
                size="lg"
                className="flex-1 h-14 text-sm rounded-none uppercase tracking-widest hover:bg-primary/90 transition-colors"
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending || (needsSelection && !selectionComplete)}
              >
                {addToCartMutation.isPending
                  ? t("btn.addingToCart")
                  : needsSelection && !selectionComplete
                  ? `${t("common.color").toLowerCase() !== t("common.size").toLowerCase() && !selectedColor && colors.length > 0 ? t("product.selectColor") : t("product.selectSize")}`
                  : t("btn.addToCart")}
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="w-14 h-14 rounded-none shrink-0 p-0 border-border hover:bg-muted transition-colors"
              onClick={handleWishlist}
              aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
            >
              <Heart className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? "fill-red-500 text-red-500 scale-110" : ""}`} />
            </Button>
          </div>

          {/* Shipping & policy */}
          <div className="border border-border divide-y divide-border bg-muted/10">
            {[
              { icon: Truck, text: "Free shipping on orders over 2,000 EGP" },
              { icon: RotateCcw, text: "Easy 14-day return policy" },
              { icon: ShieldCheck, text: "Secure checkout & payment" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 px-6 py-4">
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── REVIEWS SECTION ──────────────────────────────────────────────── */}
      <section id="reviews-section" className="border-t border-border pt-20 mb-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{t("reviews.customerFeedback")}</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">{t("reviews.title")}</h2>
          </div>
          {reviewsData?.canReview && (
            <Button onClick={openWriteReview} className="shrink-0 rounded-none uppercase tracking-widest text-xs h-12 px-6">
              <PenLine className="w-4 h-4 me-2" /> {t("reviews.write")}
            </Button>
          )}
          {user && !reviewsData?.canReview && !reviewsData?.userReview && (
            <p className="text-sm text-muted-foreground max-w-xs text-right bg-muted/30 p-3">
              {t("reviews.onlyDelivered")}
            </p>
          )}
        </div>

        {reviewsLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="border border-border p-6 h-32 animate-pulse bg-muted/20 rounded-none" />)}
          </div>
        ) : (
          <>
            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12 pb-12 border-b border-border">
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center bg-muted/10 p-8 border border-border">
                  <span className="font-serif text-7xl font-bold leading-none mb-4">
                    {reviewsData.stats.averageRating.toFixed(1)}
                  </span>
                  <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly />
                  <span className="text-sm text-muted-foreground mt-4 uppercase tracking-widest">
                    Based on {reviewsData.stats.totalReviews} {t("reviews.total")}
                  </span>
                </div>
                <div className="md:col-span-8 space-y-3 flex flex-col justify-center">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviewsData.stats.distribution[star.toString() as "1" | "2" | "3" | "4" | "5"] ?? 0;
                    const pct = reviewsData.stats.totalReviews ? Math.round((count / reviewsData.stats.totalReviews) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 w-12 shrink-0 text-sm font-medium">
                          {star}<Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="flex-1 bg-muted h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviewsData?.userReview && (
              <div className="mb-10">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("reviews.yourReview")}</p>
                <ReviewCard
                  review={reviewsData.userReview}
                  currentUserId={user?.id}
                  onEdit={() => openEditReview(reviewsData.userReview!)}
                  onDelete={() => handleDeleteReview(reviewsData.userReview!.id)}
                />
              </div>
            )}

            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <>
                <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
                  <span className="text-sm font-medium uppercase tracking-widest">{reviewsData.total} Reviews</span>
                  <select
                    value={reviewSort}
                    onChange={e => { setReviewSort(e.target.value); setReviewPage(1); }}
                    className="border border-border px-4 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-widest font-medium"
                  >
                    <option value="newest">{t("reviews.newestFirst")}</option>
                    <option value="oldest">{t("reviews.oldestFirst")}</option>
                    <option value="highest">{t("reviews.highestRating")}</option>
                    <option value="lowest">{t("reviews.lowestRating")}</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {reviewsData.reviews.filter(r => r.userId !== user?.id).map(review => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      currentUserId={user?.id}
                      onEdit={() => openEditReview(review)}
                      onDelete={() => handleDeleteReview(review.id)}
                    />
                  ))}
                </div>

                {reviewsData.total > reviewsData.limit && (
                  <div className="flex justify-center gap-2 mt-12">
                    <Button
                      variant="outline" size="sm" disabled={reviewPage === 1} className="rounded-none px-6 uppercase tracking-widest text-xs h-10"
                      onClick={() => setReviewPage(p => p - 1)}
                    >{t("reviews.prev")}</Button>
                    <span className="px-6 py-2 text-sm text-muted-foreground font-medium flex items-center">
                      {t("common.page")} {reviewPage} {t("common.of")} {Math.ceil(reviewsData.total / reviewsData.limit)}
                    </span>
                    <Button
                      variant="outline" size="sm" disabled={reviewPage >= Math.ceil(reviewsData.total / reviewsData.limit)} className="rounded-none px-6 uppercase tracking-widest text-xs h-10"
                      onClick={() => setReviewPage(p => p + 1)}
                    >{t("reviews.next")}</Button>
                  </div>
                )}
              </>
            )}

            {reviewsData && reviewsData.stats.totalReviews === 0 && (
              <div className="border border-border p-16 text-center bg-muted/10">
                <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-6" />
                <p className="font-serif text-2xl font-bold mb-2">{t("reviews.noReviews")}</p>
                <p className="text-muted-foreground">{t("reviews.noReviewsDesc")}</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Review Write/Edit Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <h3 className="font-serif text-2xl font-bold">{editingReview ? t("reviews.edit") : t("reviews.write")}</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-3 block">{t("reviews.rating")} *</label>
                <StarRating
                  value={reviewForm.rating}
                  onChange={v => setReviewForm(f => ({ ...f, rating: v }))}
                  size="md"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-3 block">
                  {t("reviews.titleLabel")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t("reviews.summarize")}
                  className="w-full border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-3 block">
                  {t("reviews.commentLabel")} * <span className="text-muted-foreground font-normal">(min 10 chars)</span>
                </label>
                <textarea
                  rows={5}
                  maxLength={2000}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder={t("reviews.placeholder")}
                  className="w-full border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50"
                />
                <p className="text-xs text-muted-foreground text-right mt-2">{reviewForm.comment.length}/2000</p>
              </div>
              <div className="flex gap-4 pt-4 border-t border-border mt-8">
                <Button type="button" variant="outline" className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs font-bold" onClick={() => setShowReviewModal(false)}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs font-bold"
                  disabled={createReviewMutation.isPending || updateReviewMutation.isPending}>
                  {createReviewMutation.isPending || updateReviewMutation.isPending
                    ? "Saving..."
                    : editingReview ? t("reviews.update") : t("reviews.submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RELATED PRODUCTS ───────────────────────────────────────────── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="border-t border-border pt-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">{t("product.youMayAlsoLike")}</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {relatedProducts.map(rp => (
              <ProductCard
                key={rp.id}
                id={rp.id}
                nameEn={rp.nameEn}
                nameAr={rp.nameAr}
                price={rp.price}
                salePrice={rp.salePrice}
                imageUrl={rp.images?.[0]?.imageUrl}
                categoryName={rp.categoryName}
                variants={rp.variants}
                averageRating={rp.averageRating}
                reviewCount={rp.reviewCount}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}