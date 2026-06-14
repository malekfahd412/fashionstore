import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useGetCart, useCreateOrder } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PaymobMethod = "card" | "meeza" | "vodafone";
type PaymentMethod = "cash_on_delivery" | PaymobMethod;

type BillingErrors = Partial<Record<"firstName" | "lastName" | "address" | "city" | "phone", string>>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: cart, isLoading } = useGetCart();
  const createOrderMutation = useCreateOrder();

  const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; description: string; paymob: boolean }> = [
    { id: "cash_on_delivery", label: t("payment.cod.label"), description: t("payment.cod.desc"), paymob: false },
    { id: "card", label: t("payment.card.label"), description: t("payment.card.desc"), paymob: true },
    { id: "meeza", label: t("payment.meeza.label"), description: t("payment.meeza.desc"), paymob: true },
    { id: "vodafone", label: t("payment.vodafone.label"), description: t("payment.vodafone.desc"), paymob: true },
  ];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [processing, setProcessing] = useState(false);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponData, setCouponData] = useState<{ discountType: string; discountValue: number } | null>(null);

  const [billing, setBilling] = useState({
    firstName: "", lastName: "", address: "", city: "Cairo", phone: "",
  });

  const search = useSearch();
  const autoAppliedRef = useRef(false);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    const params = new URLSearchParams(search);
    const code = params.get("coupon")?.trim().toUpperCase();
    if (!code) return;
    autoAppliedRef.current = true;
    setCouponCode(code);
    fetch(`${BASE}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then(r => r.json() as Promise<{ discountType?: string; discountValue?: number; error?: string }>).then(data => {
      if (data.discountType && data.discountValue !== undefined) {
        setCouponData({ discountType: data.discountType, discountValue: data.discountValue });
        setCouponApplied(true);
      } else {
        setCouponError(data.error ?? "Coupon could not be applied");
      }
    }).catch(() => setCouponError("Failed to validate coupon"));
  }, [search]);

  if (isLoading) return <div className="p-16 text-center">{t("common.loading")}</div>;
  if (!cart || !cart.items?.length) {
    setLocation("/cart");
    return null;
  }

  const isPaymob = paymentMethod !== "cash_on_delivery";

  function validateBilling(): BillingErrors {
    const errors: BillingErrors = {};
    if (!billing.firstName.trim()) errors.firstName = `${t("checkout.firstName")} is required`;
    if (!billing.lastName.trim()) errors.lastName = `${t("checkout.lastName")} is required`;
    if (!billing.address.trim()) errors.address = `${t("checkout.address")} is required`;
    if (!billing.city.trim()) errors.city = `${t("checkout.city")} is required`;
    if (!billing.phone.trim()) errors.phone = `${t("checkout.phone")} is required`;
    return errors;
  }

  async function handleValidateCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponError("");
    try {
      const res = await fetch(`${BASE}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setCouponError(err.error ?? "Invalid coupon");
        setCouponApplied(false);
        setCouponData(null);
        return;
      }
      const data = await res.json() as { discountType: string; discountValue: number };
      setCouponData(data);
      setCouponApplied(true);
      setCouponCode(code);
      toast({ title: "Coupon applied!", description: `Discount: ${data.discountType === "percentage" ? `${data.discountValue}%` : `${data.discountValue} EGP`}` });
    } catch {
      setCouponError("Failed to validate coupon");
    }
  }

  const cartSubtotal = cart!.subtotal ?? 0;

  function calcDiscount(): number {
    if (!couponApplied || !couponData) return 0;
    if (couponData.discountType === "percentage") {
      return Math.min((cartSubtotal * couponData.discountValue) / 100, cartSubtotal);
    }
    return Math.min(couponData.discountValue, cartSubtotal);
  }

  const discount = calcDiscount();
  const total = Math.max(0, cartSubtotal - discount);

  async function initiatePaymob(orderId: number) {
    const token = localStorage.getItem("auth_token");
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
      toast({ title: t("checkout.fillRequired"), variant: "destructive" });
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
            paymentMethod: paymentMethod,
            couponCode: couponApplied && couponCode ? couponCode : undefined,
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
        toast({ title: t("checkout.successTitle"), description: t("checkout.successDesc") });
        setLocation(`/order/${result.id}/tracking`);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Checkout failed";
      toast({ title: t("checkout.failTitle"), description: msg, variant: "destructive" });
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
      <h1 className="font-serif text-4xl font-bold mb-10">{t("checkout.title")}</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">{t("checkout.shippingInfo")}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("checkout.firstName")} field="firstName" placeholder={language === "ar" ? "محمد" : "John"} />
                <Field label={t("checkout.lastName")} field="lastName" placeholder={language === "ar" ? "أحمد" : "Doe"} />
              </div>
              <Field label={t("checkout.address")} field="address" placeholder={language === "ar" ? "١٢٣ شارع الأزياء" : "123 Fashion St"} />
              <Field label={t("checkout.city")} field="city" placeholder={language === "ar" ? "القاهرة" : "Cairo"} />
              <Field label={t("checkout.phone")} field="phone" placeholder="+20 100 000 0000" type="tel" />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">{t("checkout.couponCode")}</h2>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={e => {
                  setCouponCode(e.target.value.toUpperCase());
                  if (couponApplied) { setCouponApplied(false); setCouponData(null); }
                  setCouponError("");
                }}
                placeholder={t("checkout.enterCoupon")}
                className={couponError ? "border-destructive" : couponApplied ? "border-green-500" : ""}
                disabled={processing}
              />
              <Button type="button" variant="outline" onClick={handleValidateCoupon} disabled={!couponCode.trim() || processing}>
                {t("btn.apply")}
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
            {couponApplied && couponData && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                {t("checkout.couponApplied")} {couponData.discountType === "percentage" ? `${couponData.discountValue}%` : `${couponData.discountValue} EGP`} {t("checkout.off")}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">{t("checkout.paymentMethod")}</h2>
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
                {t("checkout.paymobRedirect")}
              </div>
            )}
          </section>
        </div>

        <div>
          <div className="bg-muted p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b">{t("checkout.orderSummary")}</h2>
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
              {cart.items.map(item => (
                <div key={item.variantId} className="flex gap-4 text-sm">
                  <div className="w-16 aspect-[3/4] bg-background shrink-0 overflow-hidden">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{language === "en" ? item.nameEn : item.nameAr}</p>
                    <p className="text-muted-foreground text-xs">{item.color} · {item.size} · {t("checkout.qty")}: {item.quantity}</p>
                    <p className="font-bold">{((item.salePrice || item.price) * item.quantity).toFixed(2)} EGP</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>{t("common.subtotal")}</span>
                <span>{cart.subtotal.toFixed(2)} EGP</span>
              </div>
              {couponApplied && discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>{t("checkout.discountLabel")} ({couponCode})</span>
                  <span>−{discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t("common.shipping")}</span>
                <span className="text-green-600 font-medium">{t("common.free")}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2">
                <span>{t("common.total")}</span>
                <span>{total.toFixed(2)} EGP</span>
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
                  {isPaymob ? t("btn.redirectingToPaymob") : t("checkout.processing")}
                </span>
              ) : isPaymob ? t("btn.payWithPaymob") : t("btn.placeOrder")}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {t("checkout.terms")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
