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
        className="w-full sm:max-w-[400px] flex flex-col p-0 border-l border-black/8"
        style={{ fontFamily: "'Inter', sans-serif", boxShadow: "-20px 0 60px rgba(0,0,0,0.08)" }}
      >
        <SheetTitle className="sr-only">Shopping Bag</SheetTitle>

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-8 pb-6 border-b border-black/6">
          <div>
            <p className="text-[7px] font-bold tracking-[0.45em] uppercase text-black/30 mb-2">Velora</p>
            <h2
              className="text-2xl font-bold text-[#111111] leading-none tracking-[-0.02em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Your Bag
            </h2>
            {totalItems > 0 && (
              <p className="text-[9px] text-black/35 mt-1.5 tracking-[0.2em] uppercase font-bold">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 flex items-center justify-center text-black/35 hover:text-[#111111] transition-colors mt-0.5"
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
            <div className="flex flex-col items-center justify-center h-full text-center px-10 py-24 gap-7">
              <div className="w-16 h-16 border border-black/8 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-black/20" strokeWidth={1.5} />
              </div>
              <div>
                <p
                  className="text-xl font-bold text-[#111111] mb-2.5 tracking-[-0.01em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Your bag is empty
                </p>
                <p className="text-xs text-black/35 tracking-[0.04em] font-light">Add pieces you love to your bag</p>
              </div>
              <button
                onClick={() => navigateTo("/products")}
                className="mt-1 bg-[#111111] text-white px-10 py-3.5 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors"
              >
                {t("btn.startShopping")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4 px-7 py-6 group/item">
                  <button
                    onClick={() => navigateTo(`/products/${item.productId}`)}
                    className="w-[68px] shrink-0 bg-[#F2F1EF] overflow-hidden"
                  >
                    <div className="overflow-hidden" style={{ aspectRatio: "2/3" }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-black/18" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex-1 flex flex-col min-w-0 py-0.5">
                    <div className="flex justify-between items-start gap-2 mb-2.5">
                      <button
                        onClick={() => navigateTo(`/products/${item.productId}`)}
                        className="text-sm font-medium text-[#111111] leading-snug text-left hover:opacity-60 transition-opacity line-clamp-2 tracking-[0.01em]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}
                      </button>
                      <button
                        onClick={() => handleRemove(item.variantId)}
                        className="text-black/28 hover:text-[#111111] p-0.5 transition-colors shrink-0 mt-0.5 opacity-0 group-hover/item:opacity-100"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(item.color || item.size) && (
                      <p className="text-[8px] tracking-[0.25em] uppercase text-black/32 font-bold mb-3.5">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-black/10 h-7">
                        <button
                          className="w-7 h-full flex items-center justify-center text-black/40 hover:text-[#111111] hover:bg-[#F5F4F2] transition-colors disabled:opacity-30"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-[#111111]">{item.quantity}</span>
                        <button
                          className="w-7 h-full flex items-center justify-center text-black/40 hover:text-[#111111] hover:bg-[#F5F4F2] transition-colors"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        {item.salePrice ? (
                          <div>
                            <span className="text-sm font-bold text-[#C9A227]">{(Number(item.salePrice) * item.quantity).toLocaleString()} EGP</span>
                            <span className="block text-[10px] line-through text-black/25">{(Number(item.price) * item.quantity).toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-[#111111]">{(Number(item.price) * item.quantity).toLocaleString()} EGP</span>
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
            <div className="px-7 py-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/38">Subtotal</span>
                <span className="text-sm font-medium text-[#111111] tracking-wide">{subtotal.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/38">Shipping</span>
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A227]">Free</span>
              </div>
              <div className="h-[1px] bg-black/6 my-2" />
              <div className="flex justify-between items-center pt-1">
                <span
                  className="text-base font-bold text-[#111111] tracking-[-0.01em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Total
                </span>
                <span
                  className="text-lg font-bold text-[#111111] tracking-[-0.01em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {subtotal.toLocaleString()} EGP
                </span>
              </div>
            </div>

            <div className="px-7 pb-7 space-y-2.5">
              <button
                className="w-full bg-[#111111] text-white py-4 text-[9px] font-bold tracking-[0.32em] uppercase hover:bg-[#C9A227] transition-colors duration-300 flex items-center justify-center gap-3"
                onClick={() => navigateTo("/checkout")}
              >
                Checkout
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                className="w-full border border-black/10 text-[#111111] py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:border-black/35 transition-colors"
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
