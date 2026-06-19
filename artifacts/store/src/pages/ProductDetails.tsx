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
import { Heart, Truck, RotateCcw, ShieldCheck, Star, PenLine, Trash2, CheckCircle2, X, Bell, Minus, Plus, Share2, Copy, Check } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ImageGallery from "@/components/product/ImageGallery";
import VariantSwatches from "@/components/product/VariantSwatches";
import SizeSelector from "@/components/product/SizeSelector";
import { ProductBadge, computeBadge } from "@/components/product/ProductBadge";

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
          <Star className={`${sz} transition-colors ${i <= (hovered || value) ? "fill-[#C9A227] text-[#C9A227]" : "text-foreground/15"}`} />
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
  const [helpful, setHelpful] = useState<'up' | 'down' | null>(null);
  const [helpfulCount, setHelpfulCount] = useState(0);

  const handleHelpful = (vote: 'up' | 'down') => {
    if (helpful === vote) { if (vote === 'up') setHelpfulCount(c => c - 1); setHelpful(null); return; }
    if (helpful === 'up' && vote === 'down') setHelpfulCount(c => c - 1);
    if (helpful === null && vote === 'up') setHelpfulCount(c => c + 1);
    setHelpful(vote);
  };

  return (
    <div className="border-b border-border py-12 first:pt-0">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <StarRating value={review.rating} readonly size="sm" />
            {review.verifiedPurchase && (
              <span className="velora-label text-accent flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> {t("reviews.verifiedPurchase")}
              </span>
            )}
          </div>
          <p className="velora-label text-foreground">{review.userName ?? t("product.anonymous")}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="velora-label text-foreground/30">
            {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {isOwn && (
            <div className="flex gap-2">
              <button onClick={onEdit} className="p-1.5 text-foreground/30 hover:text-foreground transition-colors"><PenLine className="w-4 h-4" /></button>
              <button onClick={onDelete} className="p-1.5 text-foreground/30 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
      {review.title && <h4 className="velora-heading text-xl text-foreground mb-3">{review.title}</h4>}
      {review.comment && <p className="text-[15px] font-light text-foreground/60 leading-relaxed max-w-2xl">{review.comment}</p>}
      <div className="flex items-center gap-4 mt-8">
        <span className="velora-label text-foreground/30">Helpful?</span>
        <button
          onClick={() => handleHelpful('up')}
          className={`velora-label px-3 py-1.5 border transition-all ${helpful === 'up' ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground/30 hover:text-foreground hover:border-foreground/60'}`}
        >
          Yes {helpfulCount > 0 ? `(${helpfulCount})` : ''}
        </button>
        <button
          onClick={() => handleHelpful('down')}
          className={`velora-label px-3 py-1.5 border transition-all ${helpful === 'down' ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground/30 hover:text-foreground hover:border-foreground/60'}`}
        >
          No
        </button>
      </div>
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
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const { data: recommendationsData } = useQuery<{ id: number; nameEn: string; nameAr: string | null; price: string; salePrice: string | null; images?: { imageUrl: string }[]; variants?: { id: number; color: string | null; size: string | null; stockQuantity: number }[] }[]>({
    queryKey: ["recommendations", productId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/products/${productId}/recommendations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId,
    staleTime: 300_000,
  });
  const { data: completeLookData } = useQuery<{ id: number; nameEn: string; nameAr: string | null; price: string; salePrice: string | null; images?: { imageUrl: string }[]; variants?: { id: number; color: string | null; size: string | null; stockQuantity: number }[] }[]>({
    queryKey: ["complete-the-look", productId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/products/${productId}/complete-the-look`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!productId,
    staleTime: 300_000,
  });
  const { data: recentlyViewedData } = useQuery<{ productId: number; nameEn: string; nameAr: string | null; imageUrl: string | null; price: number | null; salePrice: number | null }[]>({
    queryKey: ["recently-viewed-list", user?.id],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return [];
      const res = await fetch(`${BASE}/api/recently-viewed`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    staleTime: 60_000,
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
    if (user && productId) {
      const token = localStorage.getItem("auth_token");
      fetch(`${BASE}/api/recently-viewed/${productId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [user, productId]);

  const footerSentinelRef = useRef<HTMLDivElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = footerSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); return; } catch { /* cancelled */ }
    }
    setShowSharePanel(v => !v);
  };
  const handleCopy = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          <div className="w-full lg:w-[60%] space-y-6">
            <div className="aspect-[3/4] bg-secondary/30 animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-secondary/30 animate-pulse" />)}
            </div>
          </div>
          <div className="w-full lg:w-[40%] space-y-10">
            <div className="h-4 bg-secondary/30 w-1/4 animate-pulse" />
            <div className="h-16 bg-secondary/30 w-3/4 animate-pulse" />
            <div className="h-10 bg-secondary/30 w-1/3 animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 bg-secondary/30 w-full animate-pulse" />
              <div className="h-4 bg-secondary/30 w-full animate-pulse" />
              <div className="h-4 bg-secondary/30 w-2/3 animate-pulse" />
            </div>
            <div className="h-16 bg-secondary/30 w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-32 text-center">
        <div className="velora-divider mb-12" />
        <h2 className="velora-heading text-4xl text-foreground mb-8">
          {t("product.notFound")}
        </h2>
        <Link href="/products" className="velora-btn-primary">
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

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": product.images?.map(img => img.imageUrl),
    "sku": String(product.id),
    "brand": {
      "@type": "Brand",
      "name": "Velora"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "EGP",
      "price": product.salePrice ?? product.price,
      "availability": selectionComplete && isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
    },
    ...(reviewsData && reviewsData.stats.totalReviews > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": reviewsData.stats.averageRating,
        "reviewCount": reviewsData.stats.totalReviews
      }
    } : {})
  };

  return (
    <div className="bg-background">
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <nav className="max-w-[1400px] mx-auto px-6 md:px-10 py-6 flex items-center gap-3 velora-label text-foreground/30">
          <Link href="/" className="hover:text-foreground transition-colors">{t("product.home")}</Link>
          <span className="text-foreground/15">/</span>
          <Link href="/products" className="hover:text-foreground transition-colors">{t("product.shop")}</Link>
          {product.categoryName && (
            <>
              <span className="text-foreground/15">/</span>
              <Link href={`/products?categoryId=${product.categoryId}`} className="hover:text-foreground transition-colors">{product.categoryName}</Link>
            </>
          )}
          <span className="text-foreground/15">/</span>
          <span className="text-foreground/60 truncate max-w-[180px]">{name}</span>
        </nav>
      </div>

      {/* Product Layout */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 py-12 lg:py-20">

          {/* ── Gallery ─────────────────────────────────────────────────── */}
          <div className="w-full lg:w-[60%]">
            <ImageGallery
              images={(product.images ?? []).map(img => ({ id: img.id, imageUrl: img.imageUrl }))}
              productName={name ?? ""}
              savePct={savePct}
              badge={(() => {
                const totalStock = (product.variants ?? []).reduce((s, v) => s + v.stockQuantity, 0);
                const badge = computeBadge({ createdAt: product.createdAt, salePrice: product.salePrice, totalStock, featured: product.featured });
                if (!badge || badge === "sale") return null;
                return <ProductBadge type={badge} />;
              })()}
            />
          </div>

          {/* ── Product Info ──────────────────────────────────────────────── */}
          <div className="w-full lg:w-[40%] lg:sticky lg:top-32 self-start flex flex-col">

            {product.categoryName && (
              <p className="velora-label text-foreground/40 mb-6">{product.categoryName}</p>
            )}

            <h1 className="velora-heading text-[48px] md:text-[56px] leading-[1.05] text-foreground mb-6">
              {name}
            </h1>

            {/* Rating */}
            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <div className="flex items-center gap-4 mb-8">
                <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly size="sm" />
                <button
                  className="velora-label text-foreground/40 hover:text-foreground transition-colors"
                  onClick={() => document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {reviewsData.stats.totalReviews} {t("reviews.total")}
                </button>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-6 mb-12">
              {displaySalePrice ? (
                <>
                  <span className="text-[28px] font-light text-accent">{displaySalePrice} EGP</span>
                  <span className="text-xl line-through text-foreground/20 font-light">{displayPrice} EGP</span>
                </>
              ) : (
                <span className="text-[28px] font-light text-foreground">{displayPrice} EGP</span>
              )}
            </div>

            {description && (
              <div className="text-[15px] font-light text-foreground/70 leading-[1.8] mb-12 max-w-lg">
                {description}
              </div>
            )}

            <div className="space-y-10 mb-12">
              {/* Colors */}
              <VariantSwatches
                colors={colors}
                selected={selectedColor}
                onSelect={handleColorSelect}
                label={t("common.color")}
              />

              {/* Sizes */}
              <SizeSelector
                sizes={sizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
                variants={(product.variants ?? []).map(v => ({ size: v.size ?? "", color: v.color, stockQuantity: v.stockQuantity }))}
                selectedColor={selectedColor}
                label={t("common.size")}
              />

              {/* Quantity */}
              <div>
                <p className="velora-label text-foreground/40 mb-5">{t("common.quantity")}</p>
                <div className="flex items-center border border-border/60 w-36 h-12">
                  <button className="w-12 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 h-full flex items-center justify-center text-sm font-light text-foreground">{quantity}</div>
                  <button className="w-12 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div ref={ctaRef} className="flex flex-col gap-4 mb-16">
              {isOutOfStock ? (
                user ? (
                  isSubscribed ? (
                    <button
                      className="w-full velora-btn-outline border-accent text-accent hover:bg-accent/5"
                      onClick={() => unsubscribeMutation.mutate()}
                      disabled={unsubscribeMutation.isPending}
                    >
                      <Bell className="w-3.5 h-3.5 fill-accent" />
                      {unsubscribeMutation.isPending ? "..." : "Notified ✓"}
                    </button>
                  ) : (
                    <button
                      className="w-full velora-btn-outline"
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending || !notifyVariantId}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {subscribeMutation.isPending ? "Saving..." : "Notify Me When Back"}
                    </button>
                  )
                ) : (
                  <button className="w-full velora-btn-outline opacity-40 cursor-not-allowed" disabled>
                    Out of Stock
                  </button>
                )
              ) : (
                <button
                  className="w-full velora-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
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

              <div className="flex gap-4">
                <button
                  className={`flex-1 velora-btn-outline flex items-center justify-center gap-3 transition-colors ${isWishlisted ? "border-primary/20 bg-primary/5" : ""}`}
                  onClick={handleWishlist}
                  aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
                >
                  <Heart className={`w-4 h-4 transition-all duration-300 ${isWishlisted ? "fill-primary text-primary" : "text-foreground/40"}`} />
                  {isWishlisted ? "In Wishlist" : "Wishlist"}
                </button>

                <div className="relative">
                  <button
                    className="velora-btn-outline px-6 flex items-center justify-center"
                    onClick={handleShare}
                    aria-label="Share"
                  >
                    <Share2 className="w-4 h-4 text-foreground/40" />
                  </button>
                  {showSharePanel && (
                    <div className="absolute end-0 top-full mt-4 bg-background border border-border shadow-2xl p-6 w-64 z-50 animate-in fade-in slide-in-from-top-2">
                      <p className="velora-label text-foreground/40 mb-4">Share This Item</p>
                      <div className="space-y-2">
                        <button
                          onClick={handleCopy}
                          className="w-full flex items-center gap-4 py-3 px-4 border border-border/50 hover:bg-secondary transition-colors text-xs text-foreground uppercase tracking-widest"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied!" : "Copy Link"}
                        </button>
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-4 py-3 px-4 border border-border/50 hover:bg-secondary transition-colors text-xs text-foreground uppercase tracking-widest"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          Facebook
                        </a>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(name + " " + window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-4 py-3 px-4 border border-border/50 hover:bg-secondary transition-colors text-xs text-foreground uppercase tracking-widest"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping & Policy */}
            <div className="border-t border-border/50 divide-y divide-border/50">
              {[
                { icon: Truck, text: "Free shipping on orders over 2,000 EGP" },
                { icon: RotateCcw, text: "Easy 14-day return policy" },
                { icon: ShieldCheck, text: "Secure checkout & payment" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-6 py-6 group">
                  <Icon className="w-4 h-4 text-foreground/30 group-hover:text-accent transition-colors shrink-0" strokeWidth={1.5} />
                  <p className="text-[13px] text-foreground/50 tracking-wide font-light">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <section id="reviews-section" className="border-t border-border bg-background">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-12 mb-20">
            <div>
              <p className="velora-label text-foreground/40 mb-5">{t("reviews.customerFeedback")}</p>
              <h2 className="velora-heading text-[40px] text-foreground">
                {t("reviews.title")}
              </h2>
            </div>
            <div className="flex items-center gap-6">
              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <select
                  value={reviewSort}
                  onChange={e => { setReviewSort(e.target.value); setReviewPage(1); }}
                  className="bg-transparent border-b border-border/60 py-2 velora-label text-foreground focus:outline-none focus:border-accent transition-colors"
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
                  className="velora-btn-primary py-3"
                >
                  <PenLine className="w-3.5 h-3.5" /> {t("reviews.write")}
                </button>
              )}
            </div>
          </div>

          {reviewsLoading ? (
            <div className="space-y-12">
              {[1,2,3].map(i => <div key={i} className="h-40 bg-secondary/30 animate-pulse" />)}
            </div>
          ) : (
            <>
              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <div className="grid md:grid-cols-3 gap-16 mb-24 pb-24 border-b border-border/50">
                  <div className="flex flex-col items-center justify-center text-center p-12 bg-secondary/20">
                    <span className="text-[80px] velora-heading text-foreground leading-none mb-4">
                      {reviewsData.stats.averageRating.toFixed(1)}
                    </span>
                    <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly />
                    <span className="velora-label text-foreground/40 mt-6">
                      {reviewsData.stats.totalReviews} {t("reviews.total")}
                    </span>
                  </div>
                  <div className="md:col-span-2 flex flex-col justify-center space-y-5">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewsData.stats.distribution[star.toString() as "1"|"2"|"3"|"4"|"5"] ?? 0;
                      const pct = reviewsData.stats.totalReviews ? Math.round((count / reviewsData.stats.totalReviews) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-6">
                          <div className="flex items-center gap-2 w-12 shrink-0 velora-label text-foreground/50">
                            {star}<Star className="w-3 h-3 fill-accent text-accent" />
                          </div>
                          <div className="flex-1 bg-secondary h-[1px]">
                            <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${pct}%`, height: '1px' }} />
                          </div>
                          <span className="velora-label text-foreground/40 w-12 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewsData?.userReview && (
                <div className="mb-16">
                  <p className="velora-label text-foreground/40 mb-8">{t("reviews.yourReview")}</p>
                  <ReviewCard review={reviewsData.userReview} currentUserId={user?.id} onEdit={() => openEditReview(reviewsData.userReview!)} onDelete={() => handleDeleteReview(reviewsData.userReview!.id)} />
                </div>
              )}

              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <div className="space-y-0">
                  {reviewsData.reviews.filter(r => r.userId !== user?.id).map(review => (
                    <ReviewCard key={review.id} review={review} currentUserId={user?.id} onEdit={() => openEditReview(review)} onDelete={() => handleDeleteReview(review.id)} />
                  ))}
                  {reviewsData.total > reviewsData.limit && (
                    <div className="flex justify-center items-center gap-8 mt-24">
                      <button disabled={reviewPage === 1} className="velora-btn-outline px-10 py-3 disabled:opacity-20" onClick={() => setReviewPage(p => p - 1)}>{t("reviews.prev")}</button>
                      <span className="velora-label text-foreground/40">{t("common.page")} {reviewPage} {t("common.of")} {Math.ceil(reviewsData.total / reviewsData.limit)}</span>
                      <button disabled={reviewPage >= Math.ceil(reviewsData.total / reviewsData.limit)} className="velora-btn-outline px-10 py-3 disabled:opacity-20" onClick={() => setReviewPage(p => p + 1)}>{t("reviews.next")}</button>
                    </div>
                  )}
                </div>
              )}

              {reviewsData && reviewsData.stats.totalReviews === 0 && (
                <div className="py-24 text-center">
                  <div className="velora-divider mb-12" />
                  <h3 className="velora-heading text-2xl text-foreground mb-4">No reviews yet</h3>
                  <p className="velora-label text-foreground/40">Be the first to share your experience</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Complete the Look ────────────────────────────────────────────── */}
      {(completeLookData ?? []).length > 0 && (
        <section className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-10 border-t border-border/50">
          <p className="velora-label text-foreground/40 mb-6">Style It With</p>
          <h2 className="velora-heading text-[40px] text-foreground mb-16">
            Complete the Look
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
            {(completeLookData ?? []).map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                nameEn={p.nameEn}
                nameAr={p.nameAr}
                price={p.price}
                salePrice={p.salePrice}
                imageUrl={p.images?.[0]?.imageUrl}
                variants={p.variants}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Recently Viewed ───────────────────────────────────────────────── */}
      {user && (recentlyViewedData ?? []).filter(r => r.productId !== productId).length > 0 && (
        <section className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-10 border-t border-border/50">
          <p className="velora-label text-foreground/40 mb-6">Your Journey</p>
          <h2 className="velora-heading text-[40px] text-foreground mb-16">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
            {(recentlyViewedData ?? [])
              .filter(r => r.productId !== productId)
              .slice(0, 4)
              .map(r => (
                <ProductCard
                  key={r.productId}
                  id={r.productId}
                  nameEn={r.nameEn}
                  nameAr={r.nameAr}
                  price={r.price ?? 0}
                  salePrice={r.salePrice}
                  imageUrl={r.imageUrl}
                  variants={[]}
                />
              ))}
          </div>
        </section>
      )}

      {/* ── You May Also Like ────────────────────────────────────────────── */}
      {((recommendationsData ?? relatedProducts) ?? []).length > 0 && (
        <section className="py-24 md:py-32 max-w-[1400px] mx-auto px-6 md:px-10 border-t border-border/50">
          <p className="velora-label text-foreground/40 mb-6">You May Also Like</p>
          <h2 className="velora-heading text-[40px] text-foreground mb-16">
            Related Pieces
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
            {((recommendationsData ?? relatedProducts) ?? []).slice(0, 4).map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                nameEn={p.nameEn}
                nameAr={p.nameAr}
                price={p.price}
                salePrice={p.salePrice}
                imageUrl={p.images?.[0]?.imageUrl}
                variants={p.variants}
              />
            ))}
          </div>
        </section>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-background border border-border w-full max-w-xl p-10 md:p-16 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-8 end-8 text-foreground/30 hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <p className="velora-label text-foreground/40 mb-4">{editingReview ? "Update" : "Write"} a Review</p>
            <h2 className="velora-heading text-3xl text-foreground mb-10">{editingReview ? "Edit Your Thoughts" : "Share Your Experience"}</h2>
            
            <form onSubmit={handleReviewSubmit} className="space-y-10">
              <div className="space-y-4">
                <p className="velora-label text-foreground/40">Overall Rating</p>
                <StarRating value={reviewForm.rating} onChange={v => setReviewForm({ ...reviewForm, rating: v })} />
              </div>

              <div className="space-y-4">
                <label className="velora-label text-foreground/40">Review Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Summarize your experience"
                  className="w-full bg-transparent border-b border-border py-2 focus:border-accent outline-none text-foreground font-light placeholder:text-foreground/20"
                  value={reviewForm.title}
                  onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="velora-label text-foreground/40">Detailed Review</label>
                <textarea
                  placeholder="Tell us what you loved or how we can improve"
                  rows={4}
                  className="w-full bg-transparent border-b border-border py-2 focus:border-accent outline-none text-foreground font-light resize-none placeholder:text-foreground/20"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="w-full velora-btn-primary" disabled={createReviewMutation.isPending || updateReviewMutation.isPending}>
                {createReviewMutation.isPending || updateReviewMutation.isPending ? "Submitting..." : (editingReview ? "Save Changes" : "Post Review")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bar for Mobile/Scroll */}
      {showStickyBar && !footerVisible && !isOutOfStock && (
        <div className="fixed bottom-0 start-0 end-0 bg-background/95 backdrop-blur-md border-t border-border z-40 p-4 md:hidden animate-in slide-in-from-bottom duration-300">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-foreground truncate">{name}</p>
              <p className="text-accent text-[11px]">{displaySalePrice || displayPrice} EGP</p>
            </div>
            <button onClick={handleAddToCart} className="velora-btn-primary py-2.5 px-6 whitespace-nowrap">
              {t("btn.addToCart")}
            </button>
          </div>
        </div>
      )}
      <div ref={footerSentinelRef} className="h-px w-full" />
    </div>
  );
}
