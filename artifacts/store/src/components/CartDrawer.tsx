import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ShoppingBag, X, Trash2 } from "lucide-react";
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
    if (!user) {
      guestCart.updateItem(variantId, quantity);
      return;
    }

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
    if (!user) {
      guestCart.removeItem(variantId);
      toast({ title: t("btn.remove") });
      return;
    }

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
      onSuccess: () => toast({ title: t("btn.remove") }),
      onSettled: invalidateCart,
    });
  };

  const items = user ? (cart?.items || []) : guestCart.items;
  const subtotal = user ? (cart?.subtotal || 0) : guestCart.subtotal;
  const totalItems = user ? items.reduce((acc, item) => acc + item.quantity, 0) : guestCart.totalItems;

  const navigateTo = (path: string) => {
    closeCart();
    setLocation(path);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l-0">
        <SheetHeader className="p-6 border-b text-left flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="font-serif text-2xl">Your Bag ({totalItems})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <ShoppingBag className="w-12 h-12 opacity-50" />
              <p>Your bag is empty.</p>
              <Button variant="outline" onClick={() => navigateTo("/products")}>
                {t("btn.startShopping")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4 group">
                  <div className="w-20 aspect-[3/4] bg-muted shrink-0 overflow-hidden relative">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-medium text-sm line-clamp-2 hover:underline cursor-pointer" onClick={() => navigateTo(`/products/${item.productId}`)}>
                        {language === 'en' ? item.nameEn : (item.nameAr || item.nameEn)}
                      </h4>
                      <button 
                        onClick={() => handleRemove(item.variantId)}
                        className="text-muted-foreground hover:text-destructive p-1 -mt-1 -mr-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {item.color && <span>{item.color}</span>}
                      {item.color && item.size && <span> | </span>}
                      {item.size && <span>{item.size}</span>}
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-border h-8 w-24">
                        <button 
                          className="flex-1 h-full hover:bg-muted transition-colors flex items-center justify-center"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                          disabled={user ? updateMutation.isPending || item.quantity <= 1 : item.quantity <= 1}
                        >−</button>
                        <span className="flex-1 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          className="flex-1 h-full hover:bg-muted transition-colors flex items-center justify-center"
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                          disabled={user ? updateMutation.isPending : false}
                        >+</button>
                      </div>
                      
                      <div className="text-right">
                        {item.salePrice ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-destructive text-sm">{Number(item.salePrice).toLocaleString()} EGP</span>
                            <span className="text-xs line-through text-muted-foreground">{Number(item.price).toLocaleString()} EGP</span>
                          </div>
                        ) : (
                          <span className="font-bold text-sm">{Number(item.price).toLocaleString()} EGP</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-6 bg-background space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{subtotal.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Total</span>
                <span>{subtotal.toLocaleString()} EGP</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                className="w-full h-12 text-base rounded-none uppercase tracking-widest"
                onClick={() => navigateTo("/checkout")}
              >
                Checkout
              </Button>
              <Button 
                variant="outline"
                className="w-full h-12 text-base rounded-none uppercase tracking-widest"
                onClick={() => navigateTo("/cart")}
              >
                View Cart
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}