import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCart, useCreateOrder, getGetCartQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, CreditCard, Check, Banknote, Building, Smartphone, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ManualMethod = "vodafone_cash" | "etisalat_cash" | "instapay";
type PaymobMethod = "card" | "meeza";
type PaymentMethod = "cash_on_delivery" | ManualMethod | PaymobMethod;

type ManualSettings = {
  vodafone_cash_enabled: boolean;
  vodafone_cash_number: string;
  etisalat_cash_enabled: boolean;
  etisalat_cash_number: string;
  instapay_enabled: boolean;
  instapay_address: string;
  paymob_enabled: boolean;
};

type BillingErrors = Partial<Record<"firstName" | "lastName" | "address" | "city" | "phone", string>>;

const MANUAL_METHODS: ManualMethod[] = ["vodafone_cash", "etisalat_cash", "instapay"];

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: cart, isLoading } = useGetCart();
  const createOrderMutation = useCreateOrder();

  const { data: manualSettings } = useQuery<ManualSettings>({
    queryKey: ["manual-payment-settings"],
    queryFn: () => fetch(`${BASE}/api/payments/manual/settings`).then(r => r.json()) as Promise<ManualSettings>,
    staleTime: 5 * 60_000,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [processing, setProcessing] = useState(false);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponData, setCouponData] = useState<{ discountType: string; discountValue: number } | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");

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

  if (isLoading) return <div className="p-32 text-center text-muted-foreground uppercase tracking-widest font-bold">{t("common.loading")}</div>;
  if (!cart || !cart.items?.length) {
    setLocation("/cart");
    return null;
  }

  const isPaymob = paymentMethod === "card" || paymentMethod === "meeza";
  const isManual = MANUAL_METHODS.includes(paymentMethod as ManualMethod);

  function getManualAccountInfo(): string {
    if (!manualSettings) return "";
    if (paymentMethod === "vodafone_cash") return manualSettings.vodafone_cash_number;
    if (paymentMethod === "etisalat_cash") return manualSettings.etisalat_cash_number;
    if (paymentMethod === "instapay") return manualSettings.instapay_address;
    return "";
  }

  function validateBilling(): boolean {
    const errors: BillingErrors = {};
    if (!billing.firstName.trim()) errors.firstName = `${t("checkout.firstName")} ${t("checkout.isRequired")}`;
    if (!billing.lastName.trim()) errors.lastName = `${t("checkout.lastName")} ${t("checkout.isRequired")}`;
    if (!billing.address.trim()) errors.address = `${t("checkout.address")} ${t("checkout.isRequired")}`;
    if (!billing.city.trim()) errors.city = `${t("checkout.city")} ${t("checkout.isRequired")}`;
    if (!billing.phone.trim()) errors.phone = `${t("checkout.phone")} ${t("checkout.isRequired")}`;
    
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const advanceToStep2 = () => {
    if (validateBilling()) setStep(2);
    else toast({ title: t("checkout.fillRequired"), variant: "destructive" });
  };

  const advanceToStep3 = () => {
    setStep(3);
  };

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

  async function submitManualPayment(orderId: number) {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${BASE}/api/payments/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderId, method: paymentMethod, referenceNumber: referenceNumber.trim() || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Failed to submit payment reference");
    }
  }

  const handleCheckout = async () => {
    if (!validateBilling()) return;
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
            shippingName: `${billing.firstName} ${billing.lastName}`.trim(),
            shippingAddress: billing.address,
            shippingCity: billing.city,
            shippingPhone: billing.phone,
            items: orderItems,
          }
        }, {
          onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
            resolve(data as unknown as { id: number });
          },
          onError: reject,
        });
      });

      if (isPaymob) {
        const checkoutUrl = await initiatePaymob(result.id);
        window.location.href = checkoutUrl;
      } else {
        if (isManual) {
          await submitManualPayment(result.id);
        }
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
    <div className="space-y-2">
      <Label htmlFor={field} className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex gap-1">
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
        className={`h-12 rounded-none bg-background border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary ${billingErrors[field] ? "border-destructive focus-visible:ring-destructive" : ""}`}
      />
      {billingErrors[field] && (
        <p className="text-xs font-bold uppercase tracking-widest text-destructive">{billingErrors[field]}</p>
      )}
    </div>
  );

  const paymentOptions: Array<{ id: PaymentMethod; label: string; description: string; icon: any; enabled: boolean }> = [
    { id: "cash_on_delivery", label: t("payment.cod.label"), description: t("payment.cod.desc"), icon: Banknote, enabled: true },
    ...(manualSettings?.vodafone_cash_enabled ? [{ id: "vodafone_cash" as PaymentMethod, label: t("payment.vodafone.label"), description: t("payment.vodafone.desc"), icon: Smartphone, enabled: true }] : []),
    ...(manualSettings?.etisalat_cash_enabled ? [{ id: "etisalat_cash" as PaymentMethod, label: t("payment.etisalat.label"), description: t("payment.etisalat.desc"), icon: Smartphone, enabled: true }] : []),
    ...(manualSettings?.instapay_enabled ? [{ id: "instapay" as PaymentMethod, label: t("payment.instapay.label"), description: t("payment.instapay.desc"), icon: Building, enabled: true }] : []),
    ...(manualSettings?.paymob_enabled ? [
      { id: "card" as PaymentMethod, label: t("payment.card.label"), description: t("payment.card.desc"), icon: CreditCard, enabled: true },
      { id: "meeza" as PaymentMethod, label: t("payment.meeza.label"), description: t("payment.meeza.desc"), icon: CreditCard, enabled: true },
    ] : []),
  ];

  const accountInfo = getManualAccountInfo();

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-8 uppercase tracking-widest">Checkout</h1>
        
        {/* Progress Bar */}
        <div className="flex items-center justify-center max-w-md mx-auto">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={`text-[10px] uppercase tracking-widest mt-2 font-bold ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Shipping</span>
          </div>
          <div className={`flex-1 h-[2px] mx-4 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>
              {step > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <span className={`text-[10px] uppercase tracking-widest mt-2 font-bold ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Payment</span>
          </div>
          <div className={`flex-1 h-[2px] mx-4 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>
              3
            </div>
            <span className={`text-[10px] uppercase tracking-widest mt-2 font-bold ${step >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Review</span>
          </div>
        </div>
      </div>

      <div className="bg-background border border-border p-8 md:p-12 shadow-sm">
        
        {/* STEP 1: SHIPPING */}
        <div className={step === 1 ? "block animate-in fade-in slide-in-from-right-4 duration-500" : "hidden"}>
          <h2 className="font-serif text-2xl font-bold mb-8 pb-4 border-b border-border">{t("checkout.shippingInfo")}</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={t("checkout.firstName")} field="firstName" placeholder={language === "ar" ? "محمد" : "John"} />
              <Field label={t("checkout.lastName")} field="lastName" placeholder={language === "ar" ? "أحمد" : "Doe"} />
            </div>
            <Field label={t("checkout.address")} field="address" placeholder={language === "ar" ? "١٢٣ شارع الأزياء" : "123 Fashion St"} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label={t("checkout.city")} field="city" placeholder={language === "ar" ? "القاهرة" : "Cairo"} />
              <Field label={t("checkout.phone")} field="phone" placeholder="+20 100 000 0000" type="tel" />
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border flex justify-end">
            <Button size="lg" className="rounded-none uppercase tracking-widest px-10 h-14 text-sm font-bold" onClick={advanceToStep2}>
              Continue to Payment <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* STEP 2: PAYMENT */}
        <div className={step === 2 ? "block animate-in fade-in slide-in-from-right-4 duration-500" : "hidden"}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h2 className="font-serif text-2xl font-bold">{t("checkout.paymentMethod")}</h2>
            <button onClick={() => setStep(1)} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Edit Shipping</button>
          </div>
          
          <div className="space-y-4 mb-10">
            {paymentOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = paymentMethod === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`flex items-start gap-4 border p-5 cursor-pointer transition-all duration-200 ${isActive ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                  onClick={() => { setPaymentMethod(opt.id); setReferenceNumber(""); }}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isActive ? "border-primary" : "border-muted-foreground"}`}>
                    {isActive && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm uppercase tracking-widest">{opt.label}</span>
                      <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {isManual && accountInfo && (
            <div className="mb-10 p-6 bg-muted/30 border border-border space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> {t("checkout.manualAccountInfo")}</p>
                <p className="font-mono font-bold text-xl text-primary tracking-wider">{accountInfo}</p>
              </div>
              <div className="pt-4 border-t border-border">
                <Label htmlFor="referenceNumber" className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                  {t("checkout.manualReference")}
                </Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder={t("checkout.manualReferencePlaceholder")}
                  className="h-12 rounded-none bg-background border-border focus-visible:ring-1 focus-visible:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-2 font-medium">{t("checkout.manualReferenceHint")}</p>
              </div>
            </div>
          )}

          {isManual && !accountInfo && manualSettings && (
            <div className="mb-10 p-4 bg-destructive/10 border border-destructive/20 text-sm text-destructive font-bold uppercase tracking-widest text-center">
              Payment method not configured.
            </div>
          )}

          <div className="mb-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("checkout.couponCode")}</h3>
            <div className="flex gap-0">
              <Input
                value={couponCode}
                onChange={e => {
                  setCouponCode(e.target.value.toUpperCase());
                  if (couponApplied) { setCouponApplied(false); setCouponData(null); }
                  setCouponError("");
                }}
                placeholder={t("checkout.enterCoupon")}
                className={`h-12 rounded-none border-r-0 focus-visible:ring-0 uppercase tracking-widest font-bold ${couponError ? "border-destructive" : couponApplied ? "border-emerald-500" : ""}`}
                disabled={processing}
              />
              <Button type="button" variant="outline" onClick={handleValidateCoupon} disabled={!couponCode.trim() || processing} className="h-12 rounded-none px-8 uppercase tracking-widest text-xs font-bold">
                {t("btn.apply")}
              </Button>
            </div>
            {couponError && <p className="text-xs font-bold uppercase tracking-widest text-destructive mt-2">{couponError}</p>}
            {couponApplied && couponData && (
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {t("checkout.couponApplied")} {couponData.discountType === "percentage" ? `${couponData.discountValue}%` : `${couponData.discountValue} EGP`} {t("checkout.off")}
              </p>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-border flex justify-between items-center">
            <button onClick={() => setStep(1)} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Back</button>
            <Button size="lg" className="rounded-none uppercase tracking-widest px-10 h-14 text-sm font-bold" onClick={advanceToStep3}>
              Review Order <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* STEP 3: REVIEW */}
        <div className={step === 3 ? "block animate-in fade-in slide-in-from-right-4 duration-500" : "hidden"}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h2 className="font-serif text-2xl font-bold">Review Order</h2>
          </div>

          <div className="space-y-8 mb-10">
            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order Items</h3>
                <Link href="/cart" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Edit Bag</Link>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {cart.items.map(item => (
                  <div key={item.variantId} className="flex gap-4 border border-border p-3">
                    <div className="w-16 aspect-[3/4] bg-muted shrink-0 overflow-hidden">
                      {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-bold text-sm line-clamp-1 truncate">{language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                        {item.color} · {item.size} · Qty: {item.quantity}
                      </p>
                      <p className="font-bold text-sm mt-1">{((item.salePrice || item.price) * item.quantity).toLocaleString()} EGP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Shipping To</h3>
                  <button onClick={() => setStep(1)} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Edit</button>
                </div>
                <div className="text-sm font-medium leading-relaxed bg-muted/10 p-4 border border-border">
                  {billing.firstName} {billing.lastName}<br/>
                  {billing.address}<br/>
                  {billing.city}<br/>
                  {billing.phone}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment</h3>
                  <button onClick={() => setStep(2)} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Edit</button>
                </div>
                <div className="text-sm font-medium leading-relaxed bg-muted/10 p-4 border border-border">
                  <span className="uppercase tracking-widest font-bold">{paymentOptions.find(o => o.id === paymentMethod)?.label}</span>
                  {isManual && referenceNumber && <><br/><span className="text-muted-foreground mt-1 block text-xs">Ref: {referenceNumber}</span></>}
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/10 p-6 border border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground uppercase tracking-widest font-bold text-xs">{t("common.subtotal")}</span>
                <span className="font-bold">{cart.subtotal.toFixed(2)} EGP</span>
              </div>
              {couponApplied && discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span className="uppercase tracking-widest font-bold text-xs">{t("checkout.discountLabel")} ({couponCode})</span>
                  <span className="font-bold">−{discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground uppercase tracking-widest font-bold text-xs">{t("common.shipping")}</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest text-xs">{t("common.free")}</span>
              </div>
              <div className="flex justify-between font-bold text-xl border-t border-border pt-4 mt-4">
                <span className="uppercase tracking-widest">{t("common.total")}</span>
                <span className="font-serif text-2xl">{total.toFixed(2)} EGP</span>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Back</button>
            <Button
              size="lg"
              className="rounded-none uppercase tracking-widest px-12 h-16 text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              onClick={handleCheckout}
              disabled={processing || createOrderMutation.isPending}
            >
              {processing ? (
                <span className="flex items-center gap-3">
                  <span className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  {isPaymob ? t("btn.redirectingToPaymob") : t("checkout.processing")}
                </span>
              ) : isPaymob ? t("btn.payWithPaymob") : t("btn.placeOrder")}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-6 uppercase tracking-widest font-bold">
            {t("checkout.terms")}
          </p>
        </div>

      </div>
    </div>
  );
}