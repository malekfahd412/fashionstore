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
  const [helpfulCount, setHelpfulCount] = useState(Math.floor(Math.random() * 12));

  const handleHelpful = (vote: 'up' | 'down') => {
    if (helpful === vote) { if (vote === 'up') setHelpfulCount(c => c - 1); setHelpful(null); return; }
    if (helpful === 'up' && vote === 'down') setHelpfulCount(c => c - 1);
    if (helpful === null && vote === 'up') setHelpfulCount(c => c + 1);
    setHelpful(vote);
  };

  return (
    <div className="border-b border-border py-8">
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
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-foreground">{review.userName ?? t("product.anonymous")}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] text-foreground/30 tracking-[0.15em] uppercase font-medium">
            {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {isOwn && (
            <>
              <button onClick={onEdit} className="p-1 text-foreground/30 hover:text-foreground transition-colors"><PenLine className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1 text-foreground/30 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      </div>
      {review.title && <p className="font-bold text-sm text-foreground mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{review.title}</p>}
      {review.comment && <p className="text-sm text-foreground/50 leading-relaxed tracking-wide">{review.comment}</p>}
      {/* Helpfulness */}
      <div className="flex items-center gap-3 mt-4">
        <span className="text-[9px] text-foreground/30 tracking-[0.14em] uppercase">Was this helpful?</span>
        <button
          onClick={() => handleHelpful('up')}
          className={`flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase font-bold px-2.5 py-1 border transition-colors ${helpful === 'up' ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground/30 hover:text-foreground hover:border-foreground/40'}`}
        >
          👍 {helpfulCount > 0 ? helpfulCount : ''} Yes
        </button>
        <button
          onClick={() => handleHelpful('down')}
          className={`flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase font-bold px-2.5 py-1 border transition-colors ${helpful === 'down' ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-foreground/30 hover:text-foreground hover:border-foreground/40'}`}
        >
          👎 No
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
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-3">
            <div className="aspect-[3/4] bg-secondary animate-pulse" />
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="w-16 aspect-[3/4] bg-secondary animate-pulse" />)}
            </div>
          </div>
          <div className="space-y-6 pt-8">
            <div className="h-3 bg-secondary rounded-none w-1/4 animate-pulse" />
            <div className="h-12 bg-secondary rounded-none w-3/4 animate-pulse" />
            <div className="h-8 bg-secondary rounded-none w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-32 text-center">
        <h2
          className="text-4xl font-bold mb-8 text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {t("product.notFound")}
        </h2>
        <Link
          href="/products"
          className="inline-flex items-center bg-foreground text-background px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors"
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
    <div className="bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <nav className="max-w-screen-xl mx-auto px-6 md:px-10 py-4 flex items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-foreground/30 font-bold">
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
          <span className="text-foreground/50 truncate max-w-[180px]">{name}</span>
        </nav>
      </div>

      {/* Product Layout */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-16">

          {/* ── Gallery (sticky) ─────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-start lg:pt-10 py-8 lg:py-10 lg:overflow-hidden">
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
          <div className="py-10 lg:py-16 flex flex-col">

            {product.categoryName && (
              <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground/30 mb-5">{product.categoryName}</p>
            )}

            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-[0.92]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {name}
            </h1>

            {/* Rating */}
            {reviewsData && reviewsData.stats.totalReviews > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly size="sm" />
                <button
                  className="text-[9px] text-foreground/35 tracking-[0.2em] uppercase font-bold hover:text-foreground transition-colors"
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
                  <span className="text-lg line-through text-foreground/28">{displayPrice} EGP</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{displayPrice} EGP</span>
              )}
            </div>

            {description && (
              <p className="text-sm text-foreground/50 leading-relaxed tracking-wide mb-10 max-w-md">{description}</p>
            )}

            <div className="space-y-8 mb-10">
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
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground mb-4">{t("common.quantity")}</p>
                <div className="flex items-center border border-border w-32 h-11">
                  <button className="w-11 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="w-3 h-3" />
                  </button>
                  <div className="flex-1 h-full flex items-center justify-center text-sm font-bold text-foreground">{quantity}</div>
                  <button className="w-11 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div ref={ctaRef} className="flex gap-3 mb-10">
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
                      className="flex-1 py-4 text-[9px] font-bold tracking-[0.28em] uppercase border border-border text-foreground hover:border-[#111111] transition-colors flex items-center justify-center gap-2"
                      onClick={() => subscribeMutation.mutate()}
                      disabled={subscribeMutation.isPending || !notifyVariantId}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {subscribeMutation.isPending ? "Saving..." : "Notify Me When Back"}
                    </button>
                  )
                ) : (
                  <button className="flex-1 py-4 text-[9px] font-bold tracking-[0.28em] uppercase border border-border text-foreground/25 cursor-not-allowed" disabled>
                    Out of Stock
                  </button>
                )
              ) : (
                <button
                  className="flex-1 py-4 bg-foreground text-background text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
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
                className={`w-13 h-full py-4 px-4 border transition-colors shrink-0 flex items-center justify-center ${isWishlisted ? "border-red-200 bg-red-50" : "border-border hover:border-foreground/40"}`}
                onClick={handleWishlist}
                aria-label={isWishlisted ? t("product.removedFromWishlist") : t("product.savedToWishlist")}
              >
                <Heart className={`w-4 h-4 transition-all duration-300 ${isWishlisted ? "fill-red-500 text-red-500" : "text-foreground/40"}`} />
              </button>

              <div className="relative">
                <button
                  className="w-12 h-full py-4 px-3 border border-border hover:border-foreground/40 transition-colors shrink-0 flex items-center justify-center"
                  onClick={handleShare}
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4 text-foreground/40" />
                </button>
                {showSharePanel && (
                  <div className="absolute end-0 top-full mt-2 bg-background border border-border shadow-lg p-4 w-60 z-20">
                    <p className="text-[8px] font-bold tracking-[0.3em] uppercase text-foreground/30 mb-3">Share This Item</p>
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-3 py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-xs text-foreground"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 w-full flex items-center gap-3 py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-xs text-foreground"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(name + " " + window.location.href)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 w-full flex items-center gap-3 py-2.5 px-3 border border-border hover:bg-secondary transition-colors text-xs text-foreground"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping & Policy */}
            <div className="border-t border-border divide-y divide-border">
              {[
                { icon: Truck, text: "Free shipping on orders over 2,000 EGP" },
                { icon: RotateCcw, text: "Easy 14-day return policy" },
                { icon: ShieldCheck, text: "Secure checkout & payment" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 py-4">
                  <Icon className="w-4 h-4 text-foreground/30 shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-foreground/45 tracking-wide">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <section id="reviews-section" className="border-t border-border bg-secondary dark:bg-[#0d0d0d]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
            <div>
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-foreground/28 mb-4">{t("reviews.customerFeedback")}</p>
              <h2
                className="text-3xl md:text-4xl font-bold text-foreground"
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
                  className="border border-border px-4 py-2 text-[9px] bg-background focus:outline-none tracking-[0.18em] uppercase font-bold text-foreground"
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
                  className="flex items-center gap-2 bg-foreground text-background px-6 py-3 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" /> {t("reviews.write")}
                </button>
              )}
            </div>
          </div>

          {reviewsLoading ? (
            <div className="space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-secondary animate-pulse" />)}
            </div>
          ) : (
            <>
              {reviewsData && reviewsData.stats.totalReviews > 0 && (
                <div className="grid md:grid-cols-3 gap-8 mb-16 pb-16 border-b border-border">
                  <div className="flex flex-col items-center justify-center text-center bg-secondary p-10">
                    <span
                      className="text-7xl font-bold text-foreground leading-none mb-3"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {reviewsData.stats.averageRating.toFixed(1)}
                    </span>
                    <StarRating value={Math.round(reviewsData.stats.averageRating)} readonly />
                    <span className="text-[9px] text-foreground/35 mt-4 tracking-[0.2em] uppercase font-bold">
                      {reviewsData.stats.totalReviews} {t("reviews.total")}
                    </span>
                  </div>
                  <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewsData.stats.distribution[star.toString() as "1"|"2"|"3"|"4"|"5"] ?? 0;
                      const pct = reviewsData.stats.totalReviews ? Math.round((count / reviewsData.stats.totalReviews) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-4">
                          <div className="flex items-center gap-1 w-10 shrink-0 text-xs font-bold text-foreground/40">
                            {star}<Star className="w-3 h-3 fill-[#C9A227] text-[#C9A227]" />
                          </div>
                          <div className="flex-1 bg-foreground/6 h-1">
                            <div className="h-full bg-[#C9A227] transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-foreground/35 w-8 text-right font-bold tracking-widest">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewsData?.userReview && (
                <div className="mb-10">
                  <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground/30 mb-4">{t("reviews.yourReview")}</p>
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
                      <Button variant="outline" size="sm" disabled={reviewPage === 1} className="rounded-none px-8 tracking-[0.22em] uppercase text-[9px] h-10 border-border" onClick={() => setReviewPage(p => p - 1)}>{t("reviews.prev")}</Button>
                      <span className="px-6 py-2 text-[9px] text-foreground/35 font-bold tracking-widest uppercase flex items-center">{t("common.page")} {reviewPage} {t("common.of")} {Math.ceil(reviewsData.total / reviewsData.limit)}</span>
                      <Button variant="outline" size="sm" disabled={reviewPage >= Math.ceil(reviewsData.total / reviewsData.limit)} className="rounded-none px-8 tracking-[0.22em] uppercase text-[9px] h-10 border-border" onClick={() => setReviewPage(p => p + 1)}>{t("reviews.next")}</Button>
                    </div>
                  )}
                </div>
              )}

              {reviewsData && reviewsData.stats.totalReviews === 0 && (
                <div className="bg-background p-16 text-center">
                  <Star className="w-10 h-10 text-foreground/12 mx-auto mb-6" strokeWidth={1} />
                  <h3 className="text-xl font-bold text-foreground mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>No reviews yet</h3>
                  <p className="text-xs text-foreground/35 tracking-[0.18em] uppercase font-bold">Be the first to share your experience</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Complete the Look ────────────────────────────────────────────── */}
      {(completeLookData ?? []).length > 0 && (
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6 md:px-10">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-foreground/28 mb-5">Style It With</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-14 leading-[0.92]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Complete the Look
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
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
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6 md:px-10">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-foreground/28 mb-5">Your Journey</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-14 leading-[0.92]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
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

      {/* ── You May Also Like — uses /recommendations, falls back to relatedProducts ── */}
      {((recommendationsData ?? relatedProducts) ?? []).length > 0 && (
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6 md:px-10">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-foreground/28 mb-5">You May Also Like</p>
          <h2
            className="text-3xl md:text-4xl font-bold text-foreground mb-14 leading-[0.92]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Related Pieces
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
            {((recommendationsData ?? relatedProducts) ?? []).slice(0, 4).map(p => (
              <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sticky Mobile CTA ─────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-transform duration-300 ${showStickyBar ? "translate-y-0" : "translate-y-full"}`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="bg-background border-t border-border px-4 py-3 flex items-center gap-3 shadow-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{name}</p>
            <p className="text-xs text-[#C9A227] font-semibold">
              {displaySalePrice ? `${displaySalePrice} EGP` : `${displayPrice} EGP`}
            </p>
          </div>
          {isOutOfStock ? (
            <button className="shrink-0 px-6 py-3 border border-border text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/40 cursor-not-allowed" disabled>
              Sold Out
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending}
              className="shrink-0 px-6 py-3 bg-foreground text-background text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40"
            >
              {addToCartMutation.isPending ? "..." : t("btn.addToCart")}
            </button>
          )}
        </div>
      </div>

      {/* ── Review Modal ─────────────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-background w-full sm:max-w-lg mx-4 p-8 sm:p-10 shadow-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center justify-between mb-8">
              <h3
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {editingReview ? t("reviews.editTitle") : t("reviews.writeTitle")}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-foreground/30 hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground/40 mb-3">{t("reviews.rating")}</p>
                <StarRating value={reviewForm.rating} onChange={v => setReviewForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground/40 mb-2">{t("reviews.titleLabel")}</p>
                <input
                  type="text"
                  maxLength={120}
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Optional title"
                  className="w-full h-11 border border-border px-4 text-sm bg-secondary focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
              <div>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground/40 mb-2">{t("reviews.commentLabel")}</p>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Share your experience..."
                  className="w-full border border-border px-4 py-3 text-sm bg-secondary focus:outline-none focus:border-foreground transition-colors resize-none tracking-wide"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 py-4 border border-border text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/50 hover:border-foreground/40 hover:text-foreground transition-colors">
                  {t("dash.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-foreground text-background text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-40"
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
