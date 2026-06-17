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
import { Heart, Truck, RotateCcw, ShieldCheck, ChevronLeft, ChevronRight, Star, PenLine, Trash2, CheckCircle2, X, Bell, Minus, Plus } from "lucide-react";
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
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star className={`${sz} transition-colors ${i <= (hovered || value) ? "fill-[#C9A227] text-[#C9A227]" : "text-black/15"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, currentUserId, onEdit, onDelete }: {
  review: { id: number; userName?: string; rating: number; title?: string | null; comment?: string | null; verifiedPurchase: boolean; createdAt: string; userId: number };
  currentUserId?: number; onEdit?: () => void; onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const isOwn = currentUserId === review.userId;
  return (
    <div className="border-b border-black/6 py-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating value={review.rating} readonly size="sm" />
            {review.verifiedPurchase && (
              <span className="flex items-center gap-1 text-[9px] text-[#9a7a1a] tracking-[0.18em] uppercase font-bold">
                <CheckCircle2 className="w-3 h-3" /> {t("reviews.verifiedPurchase")}
              </span>
            )}
          </div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#111111]">{review.userName ?? t("product.anonymous")}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] text-black/30 tracking-[0.15em] uppercase font-medium">
            {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {isOwn && (
            <>
              <button onClick={onEdit} className="p-1 text-black/30 hover:text-[#111111] transition-colors"><PenLine className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1 text-black/30 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>
      {review.title && <p className="font-bold text-sm text-[#111111] mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{review.title}</p>}
      {review.comment && <p className="text-sm text-black/50 leading-relaxed tracking-wide">{review.comment}</p>}
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

  const openWriteReview = () => { setReviewForm({ rating: 0, title: "", comment: "" }); setEditingReview(null); setShowReviewModal(true); };
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

  useEffect(() => {
    if (user && productId) {
      const token = localStorage.getItem("auth_token");
      fetch(`${BASE}/api/recently-viewed/${productId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [user, productId]);

  const handleImageSelect = (url: string, idx: number) => { setActiveImage(url); setActiveImageIdx(idx); };
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
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
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
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to subscribe");
    },
    onSuccess: () => { void refetchNotifyStatus(); toast({ title: "You'll be notified when this item is back in stock!" }); },
  });
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${BASE}/api/products/variants/${notifyVariantId}/notify`, {
        method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
    },
    onSuccess: () => { void refetchNotifyStatus(); toast({ title: "Stock notification removed" }); },
  });

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedSize && availableSizesForColor && !availableSizesForColor.has(selectedSize)) setSelectedSize("");
  };

  const handleAddToCart = () => {
    if (!selectedColor && colors.length > 0) { toast({ title: t("product.selectColor"), variant: "destructive" }); return; }
    if (!selectedSize && sizes.length > 0) { toast({ title: t("product.selectSize"), variant: "destructive" }); return; }
    if ((colors.length > 0 || sizes.length > 0) && !selectedVariant) { toast({ title: t("product.unavailable"), variant: "destructive" }); return; }
    const variantId = selectedVariant?.id ?? product?.variants?.[0]?.id;
    if (!variantId || !product) return;

    if (!user) {
      guestCart.addItem({
        variantId, productId: product.id, nameEn: product.nameEn, nameAr: product.nameAr,
        imageUrl: product.images?.[0]?.imageUrl ?? null, price: Number(product.price),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        color: selectedVariant?.color ?? null, size: selectedVariant?.size ?? null,
        stockQuantity: selectedVariant?.stockQuantity ?? 0, quantity,
      });
      toast({ title: t("product.addedToCart") }); openCart(); return;
    }
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: { items: { variantId: number; quantity: number; price: string | number; salePrice?: string | number | null }[]; subtotal: number } | undefined) => {
      if (!old) return old;
      const existing = old.items.find(i => i.variantId === variantId);
      const items = existing
        ? old.items.map(i => i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i)
        : [...old.items, { variantId, quantity, price: Number(product.price), salePrice: product.salePrice ? Number(product.salePrice) : null, nameEn: product.nameEn, nameAr: product.nameAr, imageUrl: product.images?.[0]?.imageUrl ?? null, color: selectedVariant?.color ?? null, size: selectedVariant?.size ?? null }];
      const subtotal = items.reduce((acc, i) => acc + (Number(i.salePrice || i.price) * i.quantity), 0);
      return { ...old, items, subtotal };
    });
    addToCartMutation.mutate({ data: { variantId, quantity } }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSuccess: () => { toast({ title: t("product.addedToCart") }); openCart(); },
      onSettled: () => { qc.invalidateQueries({ queryKey: cartKey }); },
    });
  };

  const handleWishlist = () => {
    if (!user) { toast({ title: t("product.signInToSave") }); return; }
    const wKey = getGetWishlistQueryKey();
    if (isWishlisted) {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) => old ? old.filter(w => w.productId !== productId) : []);
      removeWishlistMutation.mutate({ productId }, {
        onError: () => { qc.setQueryData(wKey, previous); },
        onSuccess: () => toast({ title: t("product.removedFromWishlist") }),
        onSettled: () => { qc.invalidateQueries({ queryKey: wKey }); },
      });
    } else {
      const previous = qc.getQueryData(wKey);
      qc.setQueryData(wKey, (old: { productId: number }[] | undefined) => old ? [...old, { productId }] : [{ productId }]);
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
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-3">
            <div className="aspect-[3/4] bg-[#F7F6F4] animate-pulse" />
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="w-16 aspect-[3/4] bg-[#F7F6F4] animate-pulse" />)}
            </div>
          </div>
          <div className="space-y-6 pt-8">
            <div className="h-3 bg-[#F7F6F4] rounded-none w-1/4 animate-pulse" />
            <div className="h-12 bg-[#F7F6F4] rounded-none w-3/4 animate-pulse" />
            <div className="h-8 bg-[#F7F6F4] rounded-none w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-32 text-center">
        <h2
          className="text-4xl font-bold mb-8 text-[#111111]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t("product.notFound")}
        </h2>
        <Link
          href="/products"
          className="inline-flex items-center bg-[#111111] text-white px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors"
        >
          {t("product.backToShop")}
        </Link>
      </div>
    );
  }

  const displayPrice = Number(product.price).toLocaleString();
  const displaySalePrice = product.salePrice ? Number(product.salePrice).toLocaleString() : null;
  const savePct = product.salePrice ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : null;
  const name = language === "en" ? product.nameEn : (product.nameAr || product.nameEn);
  const description = language === "en" ? product.descriptionEn : (product.descriptionAr || product.descriptionEn);

  return (
    <div className="bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Breadcrumb */}
      <div className="border-b border-black/6">
        <nav className="max-w-screen-xl mx-auto px-6 md:px-10 py-4 flex items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-black/30 font-bold">
          <Link href="/" className="hover:text-black transition-colors">{t("product.home")}</Link>
          <span className="text-black/15">/</span>
          <Link href="/products" className="hover:text-black transition-colors">{t("product.shop")}</Link>
          {product.categoryName && (
            <>
              <span className="text-black/15">/</span>
              <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-black transition-colors">{product.categoryName}</Link>
            </>
          )}
          <span className="text-black/15">/</span>
          <span className="text-black/50 truncate max-w-[180px]">{name}</span>
        </nav>
      </div>

      {/* Product Layout */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-16">

          {/* ── Gallery (sticky) ─────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-start lg:pt-10 py-8 lg:py-10 lg:overflow-hidden">
            <div
              ref={imageRef}
              className={`relative bg-[#F7F6F4] overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              style={{ aspectRatio: "3/4" }}
              onClick={() => setZoomed(v => !v)}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setZoomed(false)}
            >
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={name ?? ""}
                  className="w-full h-full object-cover transition-transform duration-150"
                  style={zoomed ? { transform: "scale(2.2)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transition: "transform 0.1s ease" } : {}}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black/20 text-xs tracking-[0.2em] uppercase">{t("product.noImage")}</div>
              )}

              {savePct && (
                <div className="absolute top-5 start-5 bg-[#111111] text-white text-[9px] font-bold px-3 py-1.5 tracking-[0.2em] uppercase">
                  −{savePct}%
                </div>
              )}

              {product.images && product.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                    className="absolute start-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur hover:bg-white flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                    className="absolute end-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur hover:bg-white flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                {product.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => handleImageSelect(img.imageUrl, idx)}
                    className={`w-16 shrink-0 bg-[#F7F6F4] overflow-hidden transition-all duration-200 ${activeImageIdx === idx ? "ring-1 ring-[#111111]" : "opacity-45 hover:opacity-100"}`}
                    style={{ aspectRatio: "3/4" }}
                  >
                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ──────────────────────────────────────────────── */}
          <div className="py-10 lg:py-16 flex flex-col">

            {product.categoryName && (
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/30 mb-5">{product.categoryName}</p>
            )}

            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111111] mb-6 leading-[0.92]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {name}
            </h1>

            {/* Rating */}
            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly size="sm" />
                <button
                  className="text-[9px] text-black/35 tracking-[0.2em] uppercase font-bold hover:text-black transition-colors"
                  onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {reviewsData.stats.totalReviews} {t("reviews.total")}
                </button>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-4 mb-8">
              {displaySalePrice ? (
                <>
                  <span className="text-2xl font-bold text-[#C9A227]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{displaySalePrice} EGP</span>
                  <span className="text-lg line-through text-black/28">{displayPrice} EGP</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{displayPrice} EGP</span>
              )}
            </div>

            {description && (
              <p className="text-sm text-black/50 leading-relaxed tracking-wide mb-10 max-w-md">{description}</p>
            )}

            <div className="space-y-8 mb-10">
              {/* Colors */}
              {colors.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#111111]">{t("common.color")}</p>
                    {selectedColor && <span className="text-[9px] tracking-[0.2em] uppercase text-black/40 font-medium">{selectedColor}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        title={color}
                        className={`w-9 h-9 relative transition-all duration-200 ${selectedColor === color ? "ring-2 ring-[#111111] ring-offset-2" : "ring-1 ring-black/15 hover:ring-black/40"}`}
                        style={{ backgroundColor: color.toLowerCase() }}
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
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#111111]">{t("common.size")}</p>
                    <button className="text-[9px] tracking-[0.18em] uppercase text-black/35 font-bold hover:text-black transition-colors border-b border-black/20 pb-0.5">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(size => {
                      const unavailable = availableSizesForColor !== null && !availableSizesForColor.has(size);
                      return (
                        <button
                          key={size}
                          disabled={unavailable}
                          onClick={() => !unavailable && setSelectedSize(size)}
                          className={`min-w-[3rem] h-11 px-4 text-xs font-bold tracking-[0.12em] uppercase transition-all relative ${
                            selectedSize === size
                              ? "bg-[#111111] text-white border border-[#111111]"
                              : unavailable
                              ? "border border-black/8 text-black/18 cursor-not-allowed"
                              : "border border-black/15 text-[#111111] hover:border-[#111111]"
                          }`}
                        >
                          {size}
                          {unavailable && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="w-full h-[1px] bg-black/12 rotate-45 transform origin-center absolute" /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#111111] mb-4">{t("common.quantity")}</p>
                <div className="flex items-center border border-black/12 w-32 h-11">
                  <button className="w-11 h-full flex items-center justify-center text-black/40 hover:text-black hover:bg-[#F7F6F4] transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 h-full flex items-center justify-center text-sm font-bold text-[#111111]">{quantity}</div>
                  <button className="w-11 h-full flex items-center justify-center text-black/40 hover:text-black hover:bg-[#F7F6F4] transition-colors" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 mb-10">
              {isOutOfStock ? (
                user ? (
                  isSubscribed ? (
                    <button
                      className="flex-1 h-13 py-4 text-[9px] font-bold tracking-[0.28em] uppercase border border-[#C9A227] text-[#C9A227] hover:bg-[#C9A227]/5 transition-colors flex items-center justify-center gap-2"
                      onClick={() => unsubscribeMutation.mutate()}
                      disabled={unsubscribeMutation.isPending}
                    >
                      <Bell className="w-3.5 h-3.5 fill-[#C9A227]" />
                      {unsubscribeMutation.isPending ? "..." : "Notified ✓"}
                    </button>
                  ) : (
                    <button
                      className="flex-1 py-4 text-[9px] font-bold tracking-[0.28em] uppercase border border-black/15 text-[#111111] hover:border-[#111111] transition-colors flex items-center justify-center gap-2"
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending || !notifyVariantId}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {subscribeMutation.isPending ? "Saving..." : "Notify Me When Back"}
                    </button>
                  )
                ) : (
                  <button className="flex-1 py-4 text-[9px] font-bold tracking-[0.28em] uppercase border border-black/10 text-black/25 cursor-not-allowed" disabled>
                    Out of Stock
                  </button>
                )
              ) : (
                <button
                  className="flex-1 py-4 bg-[#111111] text-white text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || (needsSelection && !selectionComplete)}
                >
                  {addToCartMutation.isPending
                    ? t("btn.addingToCart")
                    : needsSelection && !selectionComplete
                    ? (!selectedColor && colors.length > 0 ? t("product.selectColor") : t("product.selectSize"))
                    : t("btn.addToCart")}
                </button>
              )}

              <button
                className={`w-13 h-full py-4 px-4 border transition-colors shrink-0 flex items-center justify-center ${isWishlisted ? "border-red-200 bg-red-50" : "border-black/12 hover:border-black/40"}`}
                onClick={handleWishlist}
                aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
              >
                <Heart className={`w-4 h-4 transition-all duration-300 ${isWishlisted ? "fill-red-500 text-red-500" : "text-black/40"}`} />
              </button>
            </div>

            {/* Shipping & Policy */}
            <div className="border-t border-black/6 divide-y divide-black/6">
              {[
                { icon: Truck, text: "Free shipping on orders over 2,000 EGP" },
                { icon: RotateCcw, text: "Easy 14-day return policy" },
                { icon: ShieldCheck, text: "Secure checkout & payment" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 py-4">
                  <Icon className="w-4 h-4 text-black/30 shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-black/45 tracking-wide">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <section id="reviews-section" className="border-t border-black/6 bg-[#F5F4F2]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <div>
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-4">{t("reviews.customerFeedback")}</p>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#111111]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("reviews.title")}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <select
                  value={reviewSort}
                  onChange={e => { setReviewSort(e.target.value); setReviewPage(1); }}
                  className="border border-black/12 px-4 py-2 text-[9px] bg-white focus:outline-none tracking-[0.18em] uppercase font-bold text-[#111111]"
                >
                  <option value="newest">{t("reviews.newestFirst")}</option>
                  <option value="oldest">{t("reviews.oldestFirst")}</option>
                  <option value="highest">{t("reviews.highestRating")}</option>
                  <option value="lowest">{t("reviews.lowestRating")}</option>
                </select>
              )}
              {reviewsData?.canReview && (
                <button
                  onClick={openWriteReview}
                  className="flex items-center gap-2 bg-[#111111] text-white px-6 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" /> {t("reviews.write")}
                </button>
              )}
            </div>
          </div>

          {reviewsLoading ? (
            <div className="space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-white animate-pulse" />)}
            </div>
          ) : (
            <>
              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <div className="grid md:grid-cols-3 gap-8 mb-16 pb-16 border-b border-black/8">
                  <div className="flex flex-col items-center justify-center text-center bg-white p-10">
                    <span
                      className="text-7xl font-bold text-[#111111] leading-none mb-3"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {reviewsData.stats.averageRating.toFixed(1)}
                    </span>
                    <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly />
                    <span className="text-[9px] text-black/35 mt-4 tracking-[0.2em] uppercase font-bold">
                      {reviewsData.stats.totalReviews} {t("reviews.total")}
                    </span>
                  </div>
                  <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewsData.stats.distribution[star.toString() as "1"|"2"|"3"|"4"|"5"] ?? 0;
                      const pct = reviewsData.stats.totalReviews ? Math.round((count / reviewsData.stats.totalReviews) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-4">
                          <div className="flex items-center gap-1 w-10 shrink-0 text-xs font-bold text-black/40">
                            {star}<Star className="w-3 h-3 fill-[#C9A227] text-[#C9A227]" />
                          </div>
                          <div className="flex-1 bg-black/6 h-1">
                            <div className="h-full bg-[#C9A227] transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-black/35 w-8 text-right font-bold tracking-widest">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewsData?.userReview && (
                <div className="mb-10">
                  <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/30 mb-4">{t("reviews.yourReview")}</p>
                  <ReviewCard review={reviewsData.userReview} currentUserId={user?.id} onEdit={() => openEditReview(reviewsData.userReview!)} onDelete={() => handleDeleteReview(reviewsData.userReview!.id)} />
                </div>
              )}

              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <div>
                  {reviewsData.reviews.filter(r => r.userId !== user?.id).map(review => (
                    <ReviewCard key={review.id} review={review} currentUserId={user?.id} onEdit={() => openEditReview(review)} onDelete={() => handleDeleteReview(review.id)} />
                  ))}
                  {reviewsData.total > reviewsData.limit && (
                    <div className="flex justify-center gap-2 mt-12">
                      <Button variant="outline" size="sm" disabled={reviewPage === 1} className="rounded-none px-8 tracking-[0.22em] uppercase text-[9px] h-10 border-black/12" onClick={() => setReviewPage(p => p - 1)}>{t("reviews.prev")}</Button>
                      <span className="px-6 py-2 text-[9px] text-black/35 font-bold tracking-widest uppercase flex items-center">{t("common.page")} {reviewPage} {t("common.of")} {Math.ceil(reviewsData.total / reviewsData.limit)}</span>
                      <Button variant="outline" size="sm" disabled={reviewPage >= Math.ceil(reviewsData.total / reviewsData.limit)} className="rounded-none px-8 tracking-[0.22em] uppercase text-[9px] h-10 border-black/12" onClick={() => setReviewPage(p => p + 1)}>{t("reviews.next")}</Button>
                    </div>
                  )}
                </div>
              )}

              {reviewsData && reviewsData.stats.totalReviews === 0 && (
                <div className="bg-white p-16 text-center">
                  <Star className="w-10 h-10 text-black/12 mx-auto mb-6" strokeWidth={1} />
                  <h3 className="text-xl font-bold text-[#111111] mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No reviews yet</h3>
                  <p className="text-xs text-black/35 tracking-[0.18em] uppercase font-bold">Be the first to share your experience</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Related Products ─────────────────────────────────────────────── */}
      {(relatedProducts ?? []).length > 0 && (
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6 md:px-10">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-5">You May Also Like</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-[#111111] mb-14 leading-[0.92]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Related Pieces
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
            {(relatedProducts ?? []).slice(0, 4).map(p => (
              <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} />
            ))}
          </div>
        </section>
      )}

      {/* ── Review Modal ─────────────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-white w-full sm:max-w-lg mx-4 p-8 sm:p-10 shadow-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center justify-between mb-8">
              <h3
                className="text-2xl font-bold text-[#111111]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {editingReview ? t("reviews.editTitle") : t("reviews.writeTitle")}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-black/30 hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/40 mb-3">{t("reviews.rating")}</p>
                <StarRating value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/40 mb-2">{t("reviews.titleLabel")}</p>
                <input
                  type="text"
                  maxLength={120}
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Optional title"
                  className="w-full h-11 border border-black/12 px-4 text-sm bg-[#F7F6F4] focus:outline-none focus:border-[#111111] transition-colors"
                />
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/40 mb-2">{t("reviews.commentLabel")}</p>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  className="w-full border border-black/12 px-4 py-3 text-sm bg-[#F7F6F4] focus:outline-none focus:border-[#111111] transition-colors resize-none tracking-wide"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-black/6">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-4 border border-black/12 text-[9px] font-bold tracking-[0.25em] uppercase text-black/50 hover:border-black/40 hover:text-black transition-colors">
                  {t("dash.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-[#111111] text-white text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40"
                  disabled={createReviewMutation.isPending || updateReviewMutation.isPending}
                >
                  {createReviewMutation.isPending || updateReviewMutation.isPending ? "..." : (editingReview ? t("reviews.update") : t("reviews.submit"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
