import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProduct, useGetRelatedProducts, useAddToCart, useAddToWishlist, useRemoveFromWishlist, useGetWishlist,
  useCreateReview, useUpdateReview, useDeleteReview,
  getGetProductQueryKey, getGetRelatedProductsQueryKey, getGetWishlistQueryKey,
} from "@workspace/api-client-react";
import type { ProductReviewsResponse } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Heart, Truck, RotateCcw, ShieldCheck, ZoomIn, ChevronLeft, ChevronRight, Star, PenLine, Trash2, CheckCircle2, X } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";

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

  const invalidateReviews = () => qc.invalidateQueries({ queryKey: ["product-reviews", productId] });

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

  const colors = [...new Set((product?.variants || []).map(v => v.color))].filter(Boolean);
  const sizes = [...new Set((product?.variants || []).map(v => v.size))].filter(Boolean);
  const availableSizesForColor = selectedColor
    ? new Set((product?.variants || []).filter(v => v.color === selectedColor).map(v => v.size))
    : null;
  const selectedVariant = product?.variants?.find(v => v.color === selectedColor && v.size === selectedSize);

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
      return;
    }
    addToCartMutation.mutate({ data: { variantId, quantity } }, {
      onSuccess: () => toast({ title: t("product.addedToCart") }),
    });
  };

  const handleWishlist = () => {
    if (!user) {
      toast({ title: t("product.signInToSave") }); return;
    }
    if (isWishlisted) {
      removeWishlistMutation.mutate({ productId }, { onSuccess: () => toast({ title: t("product.removedFromWishlist") }) });
    } else {
      addWishlistMutation.mutate({ productId }, { onSuccess: () => toast({ title: t("product.savedToWishlist") }) });
    }
  };

  const needsSelection = colors.length > 0 || sizes.length > 0;
  const selectionComplete = (!colors.length || selectedColor) && (!sizes.length || selectedSize);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => <div key={i} className="w-20 aspect-[3/4] bg-muted animate-pulse" />)}
            </div>
          </div>
          <div className="space-y-4 pt-4">
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
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold mb-4">{t("product.notFound")}</h2>
        <Button asChild variant="outline"><Link href="/products">{t("product.backToShop")}</Link></Button>
      </div>
    );
  }

  const displayPrice = Number(product.price).toLocaleString();
  const displaySalePrice = product.salePrice ? Number(product.salePrice).toLocaleString() : null;
  const savePct = product.salePrice
    ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100)
    : null;
  const name = language === "en" ? product.nameEn : product.nameAr;
  const description = language === "en" ? product.descriptionEn : product.descriptionAr;

  return (
    <div className="container mx-auto px-4 py-10">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">{t("product.home")}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground">{t("product.shop")}</Link>
        {product.categoryName && (
          <>
            <span>/</span>
            <span>{product.categoryName}</span>
          </>
        )}
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-20">
        {/* Gallery */}
        <div className="space-y-3">
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
                        transform: "scale(2)",
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transition: "transform 0.1s ease",
                      }
                    : {}
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("product.noImage")}</div>
            )}

            {!zoomed && activeImage && (
              <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 flex items-center gap-1 text-muted-foreground">
                <ZoomIn className="w-3 h-3" /> {t("product.zoomHint")}
              </div>
            )}

            {savePct && (
              <div className="absolute top-3 left-3 bg-destructive text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                -{savePct}%
              </div>
            )}

            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => handleImageSelect(img.imageUrl, idx)}
                  className={`w-20 aspect-[3/4] bg-muted border-2 flex-shrink-0 overflow-hidden transition-colors ${
                    activeImageIdx === idx ? "border-primary" : "border-transparent hover:border-border"
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.categoryName && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{product.categoryName}</p>
          )}

          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight">{name}</h1>

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            {displaySalePrice ? (
              <>
                <span className="text-3xl font-bold text-destructive">{displaySalePrice} EGP</span>
                <span className="text-xl line-through text-muted-foreground">{displayPrice} EGP</span>
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 font-semibold">
                  {t("product.save")} {savePct}%
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold">{displayPrice} EGP</span>
            )}
          </div>

          {description && (
            <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{description}</p>
          )}

          <div className="space-y-6 mb-8">
            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider">{t("common.color")}</h3>
                  {selectedColor && <span className="text-sm text-muted-foreground">{selectedColor}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`px-4 py-2 border text-sm font-medium transition-all ${
                        selectedColor === color
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider">{t("common.size")}</h3>
                  {selectedColor && (
                    <span className="text-xs text-muted-foreground">
                      {availableSizesForColor?.size ?? 0} {t("product.availableSizes")} {sizes.length} {t("product.availableSizesLabel")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => {
                    const unavailable = availableSizesForColor !== null && !availableSizesForColor.has(size);
                    return (
                      <button
                        key={size}
                        disabled={unavailable}
                        onClick={() => !unavailable && setSelectedSize(size)}
                        className={`w-12 h-12 flex items-center justify-center border text-sm font-medium transition-all relative ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : unavailable
                            ? "border-border text-muted-foreground/40 cursor-not-allowed line-through bg-muted/30"
                            : "border-border hover:border-primary/50"
                        }`}
                        title={unavailable ? `${size} not available in ${selectedColor}` : undefined}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {!selectedColor && sizes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{t("product.selectColorFirst")}</p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">{t("common.quantity")}</h3>
              <div className="flex items-center border border-border w-32">
                <button className="flex-1 py-2.5 hover:bg-muted transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <div className="flex-1 text-center font-medium text-sm">{quantity}</div>
                <button className="flex-1 py-2.5 hover:bg-muted transition-colors" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3 mb-8">
            <Button
              size="lg"
              className="flex-1 h-13 text-base rounded-none uppercase tracking-widest"
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending || (needsSelection && !selectionComplete)}
            >
              {addToCartMutation.isPending
                ? t("btn.addingToCart")
                : needsSelection && !selectionComplete
                ? `${t("common.color").toLowerCase() !== t("common.size").toLowerCase() && !selectedColor && colors.length > 0 ? t("product.selectColor") : t("product.selectSize")}`
                : t("btn.addToCart")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-13 h-13 rounded-none shrink-0 px-4"
              onClick={handleWishlist}
              aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
            >
              <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? "fill-destructive text-destructive" : ""}`} />
            </Button>
          </div>

          {/* Shipping & policy */}
          <div className="border border-border divide-y divide-border">
            {[
              { icon: Truck, text: t("product.freeDelivery") },
              { icon: RotateCcw, text: t("product.freeReturns") },
              { icon: ShieldCheck, text: t("product.secureCheckout") },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="mt-6 pt-6 border-t border-border space-y-1.5 text-sm text-muted-foreground">
            <p className="flex justify-between">
              <span>{t("common.soldBy")}</span>
              <span className="font-medium text-foreground">{product.vendorName}</span>
            </p>
            {product.sku && (
              <p className="flex justify-between">
                <span>{t("common.sku")}</span>
                <span className="font-medium text-foreground">{product.sku}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── REVIEWS SECTION ──────────────────────────────────────────────── */}
      <section className="border-t border-border pt-16 mb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("reviews.customerFeedback")}</p>
            <h2 className="font-serif text-3xl font-bold">{t("reviews.title")}</h2>
          </div>
          {reviewsData?.canReview && (
            <Button onClick={openWriteReview} className="shrink-0 rounded-none uppercase tracking-widest text-xs">
              <PenLine className="w-4 h-4 me-2" /> {t("reviews.write")}
            </Button>
          )}
          {user && !reviewsData?.canReview && !reviewsData?.userReview && (
            <p className="text-xs text-muted-foreground max-w-xs text-right">
              {t("reviews.onlyDelivered")}
            </p>
          )}
        </div>

        {reviewsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="border border-border p-5 h-28 animate-pulse bg-muted/30 rounded" />)}
          </div>
        ) : (
          <>
            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-10 border-b border-border">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-7xl font-bold leading-none">
                    {reviewsData.stats.averageRating.toFixed(1)}
                  </span>
                  <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly />
                  <span className="text-sm text-muted-foreground mt-2">{reviewsData.stats.totalReviews} {t("reviews.total")}</span>
                </div>
                <div className="md:col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviewsData.stats.distribution[star.toString() as "1" | "2" | "3" | "4" | "5"] ?? 0;
                    const pct = reviewsData.stats.totalReviews ? Math.round((count / reviewsData.stats.totalReviews) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12 shrink-0 text-xs text-muted-foreground">
                          {star}<Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>
                        <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviewsData?.userReview && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t("reviews.yourReview")}</p>
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
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <span className="text-sm text-muted-foreground">{reviewsData.total} {t("reviews.total")}</span>
                  <select
                    value={reviewSort}
                    onChange={e => { setReviewSort(e.target.value); setReviewPage(1); }}
                    className="border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="newest">{t("reviews.newestFirst")}</option>
                    <option value="oldest">{t("reviews.oldestFirst")}</option>
                    <option value="highest">{t("reviews.highestRating")}</option>
                    <option value="lowest">{t("reviews.lowestRating")}</option>
                  </select>
                </div>

                <div className="space-y-4">
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
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline" size="sm" disabled={reviewPage === 1} className="rounded-none"
                      onClick={() => setReviewPage(p => p - 1)}
                    >{t("reviews.prev")}</Button>
                    <span className="px-4 py-1.5 text-sm text-muted-foreground">
                      {t("common.page")} {reviewPage} {t("common.of")} {Math.ceil(reviewsData.total / reviewsData.limit)}
                    </span>
                    <Button
                      variant="outline" size="sm" disabled={reviewPage >= Math.ceil(reviewsData.total / reviewsData.limit)} className="rounded-none"
                      onClick={() => setReviewPage(p => p + 1)}
                    >{t("reviews.next")}</Button>
                  </div>
                )}
              </>
            )}

            {reviewsData && reviewsData.stats.totalReviews === 0 && (
              <div className="border border-dashed border-border p-12 text-center">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium mb-1">{t("reviews.noReviews")}</p>
                <p className="text-sm text-muted-foreground">{t("reviews.noReviewsDesc")}</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Review Write/Edit Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-serif text-lg font-bold">{editingReview ? t("reviews.edit") : t("reviews.write")}</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("reviews.rating")} *</label>
                <StarRating
                  value={reviewForm.rating}
                  onChange={v => setReviewForm(f => ({ ...f, rating: v }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("reviews.titleLabel")} <span className="text-muted-foreground">({t("common.optional")})</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={t("reviews.summarize")}
                  className="w-full border border-border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("reviews.commentLabel")} * <span className="text-muted-foreground text-xs">(min 10 chars)</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder={t("reviews.placeholder")}
                  className="w-full border border-border px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{reviewForm.comment.length}/2000</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => setShowReviewModal(false)}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" className="flex-1 rounded-none uppercase tracking-widest text-xs"
                  disabled={createReviewMutation.isPending || updateReviewMutation.isPending}>
                  {createReviewMutation.isPending || updateReviewMutation.isPending
                    ? t("reviews.saving")
                    : editingReview ? t("reviews.update") : t("reviews.submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipping & Returns info tabs */}
      <div className="border border-border mb-20">
        <div className="flex border-b border-border">
          {[t("product.shippingTab"), t("product.returnsTab")].map((tab, i) => (
            <button
              key={tab}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${i === 0 ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => {}}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6 text-sm text-muted-foreground space-y-3">
          <p><span className="font-medium text-foreground">{t("product.shippingStandard")}</span> — {t("product.shippingStandardDesc")}</p>
          <p><span className="font-medium text-foreground">{t("product.shippingExpress")}</span> — {t("product.shippingExpressDesc")}</p>
          <p className="text-xs">{t("product.shippingNote")}</p>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="border-t border-border pt-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("product.youMayAlsoLike")}</p>
            <h2 className="font-serif text-3xl font-bold">{t("product.relatedTitle")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {relatedProducts.slice(0, 4).map(prod => (
              <ProductCard
                key={prod.id}
                id={prod.id}
                nameEn={prod.nameEn}
                nameAr={prod.nameAr}
                price={prod.price}
                salePrice={prod.salePrice}
                imageUrl={prod.images?.[0]?.imageUrl}
                variants={(prod.variants ?? []).map(v => ({
                  id: v.id,
                  color: v.color ?? null,
                  size: v.size ?? null,
                  stockQuantity: v.stockQuantity ?? 0,
                }))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
