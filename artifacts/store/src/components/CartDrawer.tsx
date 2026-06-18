import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X, ShoppingBag, Minus, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CartDrawer() {
  const { isOpen, closeCart } = useCartDrawer();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const guestCart = useGuestCart();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cart, isLoading } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();

  const invalidateCart = () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() });

  const handleUpdateQuantity = (variantId: number, quantity: number) => {
    if (quantity < 1) return;
    if (!user) { guestCart.updateItem(variantId, quantity); return; }
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: any) => {
      if (!old) return old;
      const items = old.items.map((item: any) => item.variantId === variantId ? { ...item, quantity } : item);
      const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.salePrice || item.price) * item.quantity), 0);
      return { ...old, items, subtotal };
    });
    updateMutation.mutate({ variantId, data: { quantity } }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSettled: invalidateCart,
    });
  };

  const handleRemove = (variantId: number) => {
    if (!user) { guestCart.removeItem(variantId); return; }
    const cartKey = getGetCartQueryKey();
    qc.cancelQueries({ queryKey: cartKey });
    const previous = qc.getQueryData(cartKey);
    qc.setQueryData(cartKey, (old: any) => {
      if (!old) return old;
      const items = old.items.filter((item: any) => item.variantId !== variantId);
      const subtotal = items.reduce((acc: number, item: any) => acc + (Number(item.salePrice || item.price) * item.quantity), 0);
      return { ...old, items, subtotal };
    });
    removeMutation.mutate({ variantId }, {
      onError: () => { qc.setQueryData(cartKey, previous); },
      onSettled: invalidateCart,
    });
  };

  const items = user ? (cart?.items || []) : guestCart.items;
  const subtotal = user ? (cart?.subtotal || 0) : guestCart.subtotal;
  const totalItems = user ? items.reduce((acc, item) => acc + item.quantity, 0) : guestCart.totalItems;

  const navigateTo = (path: string) => { closeCart(); setLocation(path); };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        className="w-full sm:max-w-[440px] flex flex-col p-0 border-l border-border bg-background shadow-none"
      >
        <SheetTitle className="sr-only">Shopping Bag</SheetTitle>

        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-10 pb-8 border-b border-border/50">
          <div>
            <p className="velora-label text-accent mb-3">VELORA</p>
            <h2
              className="text-3xl font-serif italic text-foreground leading-none tracking-tight"
            >
              Your Bag
            </h2>
            {totalItems > 0 && (
              <p className="velora-label mt-3 opacity-40">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-10 h-10 flex items-center justify-center text-foreground/30 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24 gap-8">
              <div className="w-20 h-20 border border-border flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-foreground/10" strokeWidth={1} />
              </div>
              <div>
                <p
                  className="text-2xl font-serif italic text-foreground mb-3"
                >
                  Your bag is empty
                </p>
                <p className="text-xs text-muted-foreground font-light tracking-wide">Select your first piece of modern luxury.</p>
              </div>
              <button
                onClick={() => navigateTo("/products")}
                className="velora-btn-primary"
              >
                {t("btn.startShopping")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-6 py-8 group/item">
                  <button
                    onClick={() => navigateTo(`/products/${item.productId}`)}
                    className="w-24 shrink-0 bg-secondary overflow-hidden"
                  >
                    <div className="overflow-hidden" style={{ aspectRatio: "3/4" }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-foreground/10" strokeWidth={1} />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <button
                        onClick={() => navigateTo(`/products/${item.productId}`)}
                        className="text-base font-serif italic text-foreground leading-snug text-left hover:text-primary transition-colors line-clamp-2"
                      >
                        {language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}
                      </button>
                      <button
                        onClick={() => handleRemove(item.variantId)}
                        className="text-foreground/20 hover:text-destructive p-1 transition-colors shrink-0 -mt-1"
                        aria-label="Remove"
                      >
                        <X className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>

                    {(item.color || item.size) && (
                      <p className="velora-label opacity-40 mb-4">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <div className="mt-auto flex items-end justify-between">
                      <div className="flex items-center border border-border h-8">
                        <button
                          className="w-8 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          className="w-8 h-full flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-secondary transition-colors"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="text-right">
                        {item.salePrice ? (
                          <div className="flex flex-col">
                            <span className="text-base font-medium text-accent">{(Number(item.salePrice) * item.quantity).toLocaleString()} EGP</span>
                            <span className="text-[10px] line-through text-muted-foreground/50 italic">{(Number(item.price) * item.quantity).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-base font-medium text-foreground">{(Number(item.price) * item.quantity).toLocaleString()} EGP</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border bg-background p-8 pt-6">
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center">
                <span className="velora-label opacity-30">Subtotal</span>
                <span className="text-sm font-medium text-foreground tracking-tight">{subtotal.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="velora-label opacity-30">Shipping</span>
                <span className="velora-label text-accent">Complimentary</span>
              </div>
              <div className="h-[1px] bg-border/50 my-4" />
              <div className="flex justify-between items-center">
                <span
                  className="text-xl font-serif italic text-foreground"
                >
                  Total
                </span>
                <span
                  className="text-xl font-serif italic text-foreground"
                >
                  {subtotal.toLocaleString()} EGP
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                className="w-full velora-btn-primary py-4 justify-center"
                onClick={() => navigateTo("/checkout")}
              >
                Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                className="w-full velora-btn-outline py-4 justify-center border-border/60"
                onClick={() => navigateTo("/cart")}
              >
                View Bag
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
