import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetProduct, useGetRelatedProducts, useAddToCart } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetails() {
  const { id } = useParams();
  const productId = Number(id);
  const { language } = useLanguage();
  const { toast } = useToast();

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId }
  });

  useEffect(() => {
    if (product?.images?.[0] && !activeImage) {
      setActiveImage(product.images[0].imageUrl);
    }
  }, [product]);

  const { data: relatedProducts } = useGetRelatedProducts(productId, {
    query: { enabled: !!productId }
  });

  const addToCartMutation = useAddToCart();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="bg-muted h-6 w-1/3 animate-pulse" />
            <div className="bg-muted h-10 w-2/3 animate-pulse" />
            <div className="bg-muted h-8 w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold mb-4">Product not found</h2>
        <Button asChild variant="outline">
          <Link href="/products">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const colors = [...new Set((product.variants || []).map(v => v.color))].filter(Boolean);
  const sizes = [...new Set((product.variants || []).map(v => v.size))].filter(Boolean);

  const availableSizesForColor = selectedColor
    ? new Set((product.variants || []).filter(v => v.color === selectedColor).map(v => v.size))
    : null;

  const selectedVariant = product.variants?.find(
    v => v.color === selectedColor && v.size === selectedSize
  );

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (selectedSize && availableSizesForColor && !availableSizesForColor.has(selectedSize)) {
      setSelectedSize("");
    }
  };

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      toast({ title: "Please select a color and size", variant: "destructive" });
      return;
    }
    if (!selectedVariant) {
      toast({ title: "This combination is not available", variant: "destructive" });
      return;
    }
    addToCartMutation.mutate({
      data: { variantId: selectedVariant.id, quantity }
    }, {
      onSuccess: () => {
        toast({ title: "Added to cart", description: `${language === 'en' ? product.nameEn : product.nameAr} — ${selectedColor}, ${selectedSize}` });
      }
    });
  };

  const needsSelection = colors.length > 0 || sizes.length > 0;
  const selectionComplete = (!colors.length || selectedColor) && (!sizes.length || selectedSize);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-muted w-full overflow-hidden">
            {activeImage ? (
              <img src={activeImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map(img => (
                <button
                  key={img.id}
                  className={`w-24 aspect-[3/4] bg-muted border-2 flex-shrink-0 overflow-hidden transition-colors ${activeImage === img.imageUrl ? 'border-primary' : 'border-transparent hover:border-border'}`}
                  onClick={() => setActiveImage(img.imageUrl)}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm text-muted-foreground uppercase tracking-wider">{product.categoryName}</div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {language === 'en' ? product.nameEn : product.nameAr}
          </h1>
          <div className="flex items-center gap-4 mb-6">
            {product.salePrice ? (
              <>
                <span className="text-2xl font-bold text-destructive">${product.salePrice}</span>
                <span className="text-xl line-through text-muted-foreground">${product.price}</span>
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 font-medium">
                  Save ${(Number(product.price) - Number(product.salePrice)).toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold">${product.price}</span>
            )}
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert mb-8 text-muted-foreground leading-relaxed">
            {language === 'en' ? product.descriptionEn : product.descriptionAr}
          </div>

          <div className="space-y-6 mb-8">
            {colors.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider">Color</h3>
                  {selectedColor && <span className="text-sm text-muted-foreground">{selectedColor}</span>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`px-4 py-2 border text-sm font-medium transition-colors ${
                        selectedColor === color
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleColorSelect(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider">Size</h3>
                  {selectedColor && (
                    <span className="text-xs text-muted-foreground">
                      {availableSizesForColor?.size ?? 0} of {sizes.length} sizes available
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(size => {
                    const unavailable = availableSizesForColor !== null && !availableSizesForColor.has(size);
                    return (
                      <button
                        key={size}
                        disabled={unavailable}
                        className={`w-12 h-12 flex items-center justify-center border text-sm font-medium transition-colors relative ${
                          selectedSize === size
                            ? 'border-primary bg-primary text-primary-foreground'
                            : unavailable
                            ? 'border-border text-muted-foreground/40 cursor-not-allowed bg-muted/30 line-through'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => !unavailable && setSelectedSize(size)}
                        title={unavailable ? `Size ${size} not available in ${selectedColor}` : undefined}
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

            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider mb-3">Quantity</h3>
              <div className="flex items-center border border-border w-32">
                <button className="flex-1 py-2 hover:bg-muted transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <div className="flex-1 text-center font-medium">{quantity}</div>
                <button className="flex-1 py-2 hover:bg-muted transition-colors" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-none uppercase tracking-widest"
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending || (needsSelection && !selectionComplete)}
          >
            {addToCartMutation.isPending
              ? "Adding..."
              : needsSelection && !selectionComplete
              ? `Select ${!selectedColor && colors.length > 0 ? "Color" : "Size"}`
              : "Add to Cart"}
          </Button>

          <div className="mt-8 border-t border-border pt-6 space-y-2 text-sm text-muted-foreground">
            <p className="flex justify-between"><span>Vendor:</span> <span className="font-medium text-foreground">{product.vendorName}</span></p>
            {product.sku && <p className="flex justify-between"><span>SKU:</span> <span className="font-medium text-foreground">{product.sku}</span></p>}
          </div>
        </div>
      </div>

      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-24 border-t border-border pt-16">
          <h2 className="font-serif text-3xl font-bold mb-8 text-center">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map(prod => (
              <Link key={prod.id} href={`/products/${prod.id}`} className="group">
                <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                  {prod.images?.[0] ? (
                    <img src={prod.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : null}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium line-clamp-1">{language === 'en' ? prod.nameEn : prod.nameAr}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">${prod.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
