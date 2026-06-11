import { useState } from "react";
import { useLocation } from "wouter";
import { useGetCart, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PaymobMethod = "card" | "meeza" | "vodafone";
type PaymentMethod = "cash_on_delivery" | PaymobMethod;

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; description: string; paymob: boolean }> = [
  { id: "cash_on_delivery", label: "Cash on Delivery", description: "Pay when your order arrives", paymob: false },
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard via Paymob", paymob: true },
  { id: "meeza", label: "Meeza Card", description: "Egyptian national debit card via Paymob", paymob: true },
  { id: "vodafone", label: "Vodafone Cash", description: "Pay with your Vodafone Cash wallet", paymob: true },
];

type BillingErrors = Partial<Record<"firstName" | "lastName" | "address" | "city" | "phone", string>>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: cart, isLoading } = useGetCart();
  const createOrderMutation = useCreateOrder();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [processing, setProcessing] = useState(false);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});

  const [billing, setBilling] = useState({
    firstName: "", lastName: "", address: "", city: "Cairo", phone: "",
  });

  if (isLoading) return <div className="p-16 text-center">Loading...</div>;
  if (!cart || !cart.items?.length) {
    setLocation("/cart");
    return null;
  }

  const isPaymob = paymentMethod !== "cash_on_delivery";

  function validateBilling(): BillingErrors {
    const errors: BillingErrors = {};
    if (!billing.firstName.trim()) errors.firstName = "First name is required";
    if (!billing.lastName.trim()) errors.lastName = "Last name is required";
    if (!billing.address.trim()) errors.address = "Address is required";
    if (!billing.city.trim()) errors.city = "City is required";
    if (!billing.phone.trim()) errors.phone = "Phone number is required";
    return errors;
  }

  async function initiatePaymob(orderId: number) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BASE}/api/payments/paymob/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        orderId,
        method: paymentMethod as PaymobMethod,
        billingData: {
          firstName: billing.firstName,
          lastName: billing.lastName,
          phone: billing.phone,
          address: billing.address,
          city: billing.city,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Payment initiation failed");
    }
    const data = await res.json() as { checkoutUrl: string };
    return data.checkoutUrl;
  }

  const handleCheckout = async () => {
    const errors = validateBilling();
    if (Object.keys(errors).length > 0) {
      setBillingErrors(errors);
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setBillingErrors({});
    setProcessing(true);
    try {
      const orderItems = cart.items.map(item => ({
        productVariantId: item.variantId,
        quantity: item.quantity,
      }));

      const result = await new Promise<{ id: number }>((resolve, reject) => {
        createOrderMutation.mutate({
          data: {
            paymentMethod: isPaymob ? "paymob" : "cash_on_delivery",
            items: orderItems,
          }
        }, {
          onSuccess: (data) => resolve(data as unknown as { id: number }),
          onError: reject,
        });
      });

      if (isPaymob) {
        const checkoutUrl = await initiatePaymob(result.id);
        window.location.href = checkoutUrl;
      } else {
        toast({ title: "Order placed successfully!", description: "We'll notify you once it ships." });
        setLocation("/dashboard/customer");
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Checkout failed";
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
      setProcessing(false);
    }
  };

  const Field = ({
    label, field, placeholder, type = "text"
  }: {
    label: string;
    field: keyof typeof billing;
    placeholder: string;
    type?: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={field} className="flex gap-1">
        {label}
        <span className="text-destructive">*</span>
      </Label>
      <Input
        id={field}
        type={type}
        value={billing[field]}
        onChange={e => {
          setBilling(b => ({ ...b, [field]: e.target.value }));
          if (billingErrors[field]) setBillingErrors(prev => ({ ...prev, [field]: undefined }));
        }}
        placeholder={placeholder}
        className={billingErrors[field] ? "border-destructive focus-visible:ring-destructive" : ""}
      />
      {billingErrors[field] && (
        <p className="text-xs text-destructive">{billingErrors[field]}</p>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="font-serif text-4xl font-bold mb-10">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Shipping Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" field="firstName" placeholder="John" />
                <Field label="Last Name" field="lastName" placeholder="Doe" />
              </div>
              <Field label="Address" field="address" placeholder="123 Fashion St" />
              <Field label="City" field="city" placeholder="Cairo" />
              <Field label="Phone" field="phone" placeholder="+20 100 000 0000" type="tel" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
              {PAYMENT_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 border p-4 rounded cursor-pointer transition-colors ${paymentMethod === opt.id ? "border-primary bg-primary/5" : "hover:border-border/80"}`}
                  onClick={() => setPaymentMethod(opt.id)}
                >
                  <RadioGroupItem value={opt.id} id={opt.id} className="mt-0.5" />
                  <Label htmlFor={opt.id} className="cursor-pointer flex-1">
                    <span className="font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </Label>
                  {opt.paymob && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium shrink-0">Paymob</span>
                  )}
                </div>
              ))}
            </RadioGroup>

            {isPaymob && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                You'll be redirected to Paymob's secure checkout to complete payment. Your order will be confirmed after successful payment.
              </div>
            )}
          </section>
        </div>

        <div>
          <div className="bg-muted p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
              {cart.items.map(item => (
                <div key={item.variantId} className="flex gap-4 text-sm">
                  <div className="w-16 aspect-[3/4] bg-background shrink-0 overflow-hidden">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{item.nameEn}</p>
                    <p className="text-muted-foreground text-xs">{item.color} · {item.size} · Qty: {item.quantity}</p>
                    <p className="font-bold">${((item.salePrice || item.price) * item.quantity).toFixed(2)}</p>
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
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full mt-8 rounded-none h-14 text-lg"
              onClick={handleCheckout}
              disabled={processing || createOrderMutation.isPending}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {isPaymob ? "Redirecting to Paymob..." : "Processing..."}
                </span>
              ) : isPaymob ? "Pay with Paymob →" : "Place Order"}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              By placing your order you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
