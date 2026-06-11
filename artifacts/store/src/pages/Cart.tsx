import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: cart, isLoading } = useGetCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();
  const clearMutation = useClearCart();

  const handleUpdateQuantity = (variantId: number, quantity: number) => {
    if (quantity < 1) return;
    updateMutation.mutate({ variantId, data: { quantity } });
  };

  const handleRemove = (variantId: number) => {
    removeMutation.mutate({ variantId }, {
      onSuccess: () => toast({ title: "Item removed" })
    });
  };

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => toast({ title: "Cart cleared" })
    });
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading cart...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center max-w-lg">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-6" />
        <h1 className="font-serif text-4xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
        <Button size="lg" className="w-full rounded-none uppercase tracking-widest h-14" asChild>
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif text-4xl font-bold">Shopping Cart</h1>
        <span className="text-muted-foreground text-sm">{totalItems} {totalItems === 1 ? "item" : "items"}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-2/3">
          <div className="space-y-6">
            {cart.items.map(item => (
              <div key={item.variantId} className="flex gap-6 border-b border-border pb-6">
                <div className="w-24 md:w-32 aspect-[3/4] bg-muted shrink-0 overflow-hidden">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between mb-2">
                    <Link href={`/products/${item.productId}`} className="font-medium hover:underline text-lg line-clamp-2">
                      {language === 'en' ? item.nameEn : item.nameAr}
                    </Link>
                    <div className="text-right shrink-0 ml-4">
                      {item.salePrice ? (
                        <>
                          <div className="font-bold text-destructive">${item.salePrice}</div>
                          <div className="text-sm line-through text-muted-foreground">${item.price}</div>
                        </>
                      ) : (
                        <div className="font-bold">${item.price}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-auto">
                    <span className="mr-4">Color: {item.color}</span>
                    <span>Size: {item.size}</span>
                  </div>

                  <div className="flex justify-between items-end mt-4">
                    <div className="flex items-center border border-border w-24 md:w-32 h-10">
                      <button
                        className="flex-1 hover:bg-muted h-full transition-colors"
                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                        disabled={updateMutation.isPending || item.quantity <= 1}
                      >−</button>
                      <div className="flex-1 text-center font-medium">{item.quantity}</div>
                      <button
                        className="flex-1 hover:bg-muted h-full transition-colors"
                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                        disabled={updateMutation.isPending}
                      >+</button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(item.variantId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/products">← Continue Shopping</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={clearMutation.isPending} className="text-muted-foreground">
              Clear Cart
            </Button>
          </div>
        </div>

        <div className="lg:w-1/3">
          <div className="bg-muted/30 p-8 border border-border sticky top-24">
            <h2 className="font-serif text-2xl font-bold mb-6 border-b border-border pb-4">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              {cart.discount && cart.discount > 0 ? (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>−${cart.discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Total</span>
                <span className="font-bold text-2xl">${cart.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full rounded-none uppercase tracking-widest h-14 text-lg"
              onClick={() => setLocation('/checkout')}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
