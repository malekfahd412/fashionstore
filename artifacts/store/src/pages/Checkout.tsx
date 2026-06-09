import { useState } from "react";
import { useLocation } from "wouter";
import { useGetCart, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: cart, isLoading } = useGetCart();
  const createOrderMutation = useCreateOrder();
  
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  
  if (isLoading) return <div className="p-16 text-center">Loading...</div>;
  if (!cart || !cart.items?.length) {
    setLocation("/cart");
    return null;
  }

  const handleCheckout = () => {
    const orderItems = cart.items.map(item => ({
      productVariantId: item.variantId,
      quantity: item.quantity,
      price: item.salePrice || item.price
    }));

    createOrderMutation.mutate({
      data: {
        paymentMethod,
        items: orderItems,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Order placed successfully!" });
        setLocation("/dashboard/customer");
      },
      onError: (err: any) => {
        toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="font-serif text-4xl font-bold mb-10">Checkout</h1>
      
      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Shipping Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue="123 Fashion St" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input defaultValue="Cairo" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input defaultValue="+201000000000" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              <div className="flex items-center space-x-2 border p-4 rounded cursor-pointer">
                <RadioGroupItem value="Cash on Delivery" id="cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">Cash on Delivery</Label>
              </div>
              <div className="flex items-center space-x-2 border p-4 rounded cursor-pointer">
                <RadioGroupItem value="Vodafone Cash" id="vf" />
                <Label htmlFor="vf" className="flex-1 cursor-pointer">Vodafone Cash</Label>
              </div>
              <div className="flex items-center space-x-2 border p-4 rounded cursor-pointer">
                <RadioGroupItem value="InstaPay" id="ip" />
                <Label htmlFor="ip" className="flex-1 cursor-pointer">InstaPay</Label>
              </div>
            </RadioGroup>
          </section>
        </div>

        <div>
          <div className="bg-muted p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
              {cart.items.map(item => (
                <div key={item.variantId} className="flex gap-4 text-sm">
                  <div className="w-16 aspect-[3/4] bg-background shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{item.nameEn}</p>
                    <p className="text-muted-foreground text-xs">Qty: {item.quantity}</p>
                    <p className="font-bold">${(item.salePrice || item.price) * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-8 rounded-none h-14 text-lg" 
              onClick={handleCheckout}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
