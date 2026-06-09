import { useState } from "react";
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
    query: { 
      enabled: !!productId,
      onSuccess: (data) => {
        if (data.images?.[0]) setActiveImage(data.images[0].imageUrl);
      }
    } 
  });
  
  const { data: relatedProducts } = useGetRelatedProducts(productId, {
    query: { enabled: !!productId }
  });
  
  const addToCartMutation = useAddToCart();

  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>;
  }
  
  if (!product) {
    return <div className="container mx-auto px-4 py-16 text-center">Product not found</div>;
  }

  // Get unique colors and sizes from variants
  const colors = [...new Set((product.variants || []).map(v => v.color))].filter(Boolean);
  const sizes = [...new Set((product.variants || []).map(v => v.size))].filter(Boolean);
  
  // Find selected variant
  const selectedVariant = product.variants?.find(
    v => v.color === selectedColor && v.size === selectedSize
  );

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      toast({ title: "Please select color and size", variant: "destructive" });
      return;
    }
    
    if (!selectedVariant) {
      toast({ title: "Selected combination not available", variant: "destructive" });
      return;
    }
    
    addToCartMutation.mutate({
      data: { variantId: selectedVariant.id, quantity }
    }, {
      onSuccess: () => {
        toast({ title: "Added to cart" });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-muted w-full overflow-hidden">
            {activeImage ? (
              <img src={activeImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">No Image</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map(img => (
                <button 
                  key={img.id} 
                  className={`w-24 aspect-[3/4] bg-muted border-2 flex-shrink-0 ${activeImage === img.imageUrl ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setActiveImage(img.imageUrl)}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
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
                <h3 className="text-sm font-medium uppercase tracking-wider mb-3">Color</h3>
                <div className="flex gap-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`px-4 py-2 border text-sm font-medium transition-colors ${selectedColor === color ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setSelectedColor(color)}
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
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(size => (
                    <button
                      key={size}
                      className={`w-12 h-12 flex items-center justify-center border text-sm font-medium transition-colors ${selectedSize === size ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wider mb-3">Quantity</h3>
              <div className="flex items-center border border-border w-32">
                <button className="flex-1 py-2 hover:bg-muted" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <div className="flex-1 text-center font-medium">{quantity}</div>
                <button className="flex-1 py-2 hover:bg-muted" onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full h-14 text-lg rounded-none uppercase tracking-widest"
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending}
          >
            {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
          </Button>
          
          <div className="mt-8 border-t border-border pt-6 space-y-2 text-sm text-muted-foreground">
            <p className="flex justify-between"><span>Vendor:</span> <span className="font-medium text-foreground">{product.vendorName}</span></p>
            {product.sku && <p className="flex justify-between"><span>SKU:</span> <span className="font-medium text-foreground">{product.sku}</span></p>}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-24">
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
