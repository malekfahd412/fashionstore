import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProduct, useGetRelatedProducts, useAddToCart, useAddToWishlist, useRemoveFromWishlist, useGetWishlist,
  getGetProductQueryKey, getGetRelatedProductsQueryKey, getGetWishlistQueryKey,
} from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/hooks/useGuestCart";
import { Heart, Truck, RotateCcw, ShieldCheck, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";

export default function ProductDetails() {
  const { id } = useParams();
  const productId = Number(id);
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const guestCart = useGuestCart();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: relatedProducts } = useGetRelatedProducts(productId, {
    query: { enabled: !!productId, queryKey: getGetRelatedProductsQueryKey(productId) },
  });
  const { data: wishlist } = useGetWishlist({
    query: { enabled: !!user, queryKey: getGetWishlistQueryKey() },
  });
  const addToCartMutation = useAddToCart();
  const addWishlistMutation = useAddToWishlist();
  const removeWishlistMutation = useRemoveFromWishlist();

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
      toast({ title: "Please select a color", variant: "destructive" }); return;
    }
    if (!selectedSize && sizes.length > 0) {
      toast({ title: "Please select a size", variant: "destructive" }); return;
    }
    if ((colors.length > 0 || sizes.length > 0) && !selectedVariant) {
      toast({ title: "This combination is not available", variant: "destructive" }); return;
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
      toast({ title: "Added to cart" });
      return;
    }
    addToCartMutation.mutate({ data: { variantId, quantity } }, {
      onSuccess: () => toast({ title: "Added to cart" }),
    });
  };

  const handleWishlist = () => {
    if (!user) {
      toast({ title: "Sign in to save items" }); return;
    }
    if (isWishlisted) {
      removeWishlistMutation.mutate({ productId }, { onSuccess: () => toast({ title: "Removed from wishlist" }) });
    } else {
      addWishlistMutation.mutate({ productId }, { onSuccess: () => toast({ title: "Saved to wishlist" }) });
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
        <h2 className="font-serif text-2xl font-bold mb-4">Product not found</h2>
        <Button asChild variant="outline"><Link href="/products">Back to Shop</Link></Button>
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
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground">Shop</Link>
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
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
            )}

            {/* Zoom hint */}
            {!zoomed && activeImage && (
              <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 flex items-center gap-1 text-muted-foreground">
                <ZoomIn className="w-3 h-3" /> Click to zoom
              </div>
            )}

            {/* Sale badge */}
            {savePct && (
              <div className="absolute top-3 left-3 bg-destructive text-white text-xs font-bold px-2 py-1 uppercase tracking-wide">
                -{savePct}%
              </div>
            )}

            {/* Prev/Next arrows */}
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

          {/* Thumbnails */}
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
                  Save {savePct}%
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold">{displayPrice} EGP</span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{description}</p>
          )}

          <div className="space-y-6 mb-8">
            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Color</h3>
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
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Size</h3>
                  {selectedColor && (
                    <span className="text-xs text-muted-foreground">
                      {availableSizesForColor?.size ?? 0} of {sizes.length} available
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
                  <p className="text-xs text-muted-foreground mt-2">Select a color to see available sizes</p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Quantity</h3>
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
                ? "Adding…"
                : needsSelection && !selectionComplete
                ? `Select ${!selectedColor && colors.length > 0 ? "Color" : "Size"}`
                : "Add to Cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-13 h-13 rounded-none shrink-0 px-4"
              onClick={handleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? "fill-destructive text-destructive" : ""}`} />
            </Button>
          </div>

          {/* Shipping & policy mini-info */}
          <div className="border border-border divide-y divide-border">
            {[
              { icon: Truck, text: "Free delivery on orders over 500 EGP" },
              { icon: RotateCcw, text: "Free 30-day returns on unworn items" },
              { icon: ShieldCheck, text: "Secure checkout — 100% protected" },
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
              <span>Sold by</span>
              <span className="font-medium text-foreground">{product.vendorName}</span>
            </p>
            {product.sku && (
              <p className="flex justify-between">
                <span>SKU</span>
                <span className="font-medium text-foreground">{product.sku}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Shipping & Returns info tabs */}
      <div className="border border-border mb-20">
        <div className="flex border-b border-border">
          {["Shipping", "Returns & Exchanges"].map((tab, i) => (
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
          <p><span className="font-medium text-foreground">Standard delivery (3–5 business days)</span> — Free on orders over 500 EGP, otherwise 50 EGP.</p>
          <p><span className="font-medium text-foreground">Express delivery (1–2 business days)</span> — Available in Cairo & Giza for 80 EGP.</p>
          <p className="text-xs">Orders placed before 2 PM are dispatched the same day. You'll receive an email with tracking details once your order ships.</p>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="border-t border-border pt-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">You May Also Like</p>
            <h2 className="font-serif text-3xl font-bold">Related Products</h2>
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
