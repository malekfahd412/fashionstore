import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { X, ShoppingBag, Minus, Plus } from "lucide-react";
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
        className="w-full sm:max-w-[420px] flex flex-col p-0 border-l border-black/8 shadow-2xl"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <SheetTitle className="sr-only">Shopping Bag</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-7 border-b border-black/6">
          <div>
            <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/35 mb-1">Velora</p>
            <h2
              className="text-xl font-bold text-[#111111] leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Your Bag
              {totalItems > 0 && (
                <span className="ms-2 text-sm font-normal text-black/35" style={{ fontFamily: "'Inter', sans-serif" }}>
                  ({totalItems})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 flex items-center justify-center text-black/40 hover:text-black transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border border-black/20 border-t-black/60 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-10 py-20 gap-6">
              <ShoppingBag className="w-10 h-10 text-black/18" strokeWidth={1} />
              <div>
                <p
                  className="text-xl font-bold text-[#111111] mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Empty Bag
                </p>
                <p className="text-xs text-black/38 tracking-wide">Add pieces you love to your bag</p>
              </div>
              <button
                onClick={() => navigateTo("/products")}
                className="mt-2 bg-[#111111] text-white px-8 py-3.5 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#C9A227] transition-colors"
              >
                {t("btn.startShopping")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-5 px-8 py-6">
                  {/* Image */}
                  <button
                    onClick={() => navigateTo(`/products/${item.productId}`)}
                    className="w-[72px] shrink-0 bg-[#F7F6F4] overflow-hidden"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-black/20" strokeWidth={1} />
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex-1 flex flex-col min-w-0 py-0.5">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <button
                        onClick={() => navigateTo(`/products/${item.productId}`)}
                        className="text-sm font-medium text-[#111111] leading-snug text-left hover:text-[#C9A227] transition-colors line-clamp-2 tracking-wide"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}
                      </button>
                      <button
                        onClick={() => handleRemove(item.variantId)}
                        className="text-black/30 hover:text-black p-0.5 transition-colors shrink-0 mt-0.5"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(item.color || item.size) && (
                      <p className="text-[9px] tracking-[0.2em] uppercase text-black/35 font-medium mb-4">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      {/* Qty control */}
                      <div className="flex items-center border border-black/12 h-8">
                        <button
                          className="w-8 h-full flex items-center justify-center text-black/50 hover:text-black hover:bg-[#F7F6F4] transition-colors"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-[#111111]">{item.quantity}</span>
                        <button
                          className="w-8 h-full flex items-center justify-center text-black/50 hover:text-black hover:bg-[#F7F6F4] transition-colors"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        {item.salePrice ? (
                          <div>
                            <span className="text-sm font-bold text-[#C9A227]">{(Number(item.salePrice) * item.quantity).toLocaleString()} EGP</span>
                            <span className="block text-xs line-through text-black/28">{(Number(item.price) * item.quantity).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[#111111]">{(Number(item.price) * item.quantity).toLocaleString()} EGP</span>
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
          <div className="border-t border-black/6 bg-white">
            {/* Totals */}
            <div className="px-8 py-6 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-black/40 tracking-[0.18em] uppercase font-bold">Subtotal</span>
                <span className="font-medium text-[#111111]">{subtotal.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-black/40 tracking-[0.18em] uppercase font-bold">Shipping</span>
                <span className="text-[#C9A227] font-bold tracking-[0.12em] uppercase text-[9px]">Free</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-black/6 mt-3">
                <span
                  className="text-base font-bold text-[#111111]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Total
                </span>
                <span
                  className="text-lg font-bold text-[#111111]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {subtotal.toLocaleString()} EGP
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="px-8 pb-8 space-y-2.5">
              <button
                className="w-full bg-[#111111] text-white py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300"
                onClick={() => navigateTo("/checkout")}
              >
                Checkout
              </button>
              <button
                className="w-full border border-black/12 text-[#111111] py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:border-black/40 transition-colors"
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
