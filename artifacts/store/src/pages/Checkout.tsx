import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCart, useCreateOrder, getGetCartQueryKey, getListOrdersQueryKey, getGetAnalyticsSummaryQueryKey, getGetVendorSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getGetSalesTimelineQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { Check, CreditCard, Banknote, Building, Smartphone, FileText, ChevronRight } from "lucide-react";

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
  useSEO({ title: "Checkout", description: "Complete your order at Velora." });
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
  const [billing, setBilling] = useState({ firstName: "", lastName: "", address: "", city: "Cairo", phone: "" });

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

  useEffect(() => {
    if (!isLoading && (!cart || !cart.items?.length)) {
      setLocation("/cart");
    }
  }, [isLoading, cart, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">{t("common.loading")}</div>;
  }
  
  if (!cart || !cart.items?.length) {
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
  const advanceToStep3 = () => setStep(3);

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
        setCouponError(err.error ?? "Invalid coupon"); setCouponApplied(false); setCouponData(null); return;
      }
      const data = await res.json() as { discountType: string; discountValue: number };
      setCouponData(data); setCouponApplied(true); setCouponCode(code);
      toast({ title: "Coupon applied!", description: `Discount: ${data.discountType === "percentage" ? `${data.discountValue}%` : `${data.discountValue} EGP`}` });
    } catch { setCouponError("Failed to validate coupon"); }
  }

  const cartSubtotal = cart!.subtotal ?? 0;
  function calcDiscount(): number {
    if (!couponApplied || !couponData) return 0;
    if (couponData.discountType === "percentage") return Math.min((cartSubtotal * couponData.discountValue) / 100, cartSubtotal);
    return Math.min(couponData.discountValue, cartSubtotal);
  }
  const discount = calcDiscount();
  const total = Math.max(0, cartSubtotal - discount);

  async function initiatePaymob(orderId: number) {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${BASE}/api/payments/paymob/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ orderId, method: paymentMethod as PaymobMethod, billingData: { firstName: billing.firstName, lastName: billing.lastName, phone: billing.phone, address: billing.address, city: billing.city } }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; throw new Error(err.error ?? "Payment initiation failed"); }
    const data = await res.json() as { checkoutUrl: string };
    return data.checkoutUrl;
  }

  async function submitManualPayment(orderId: number) {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${BASE}/api/payments/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ orderId, method: paymentMethod, referenceNumber: referenceNumber.trim() || null }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; throw new Error(err.error ?? "Failed to submit payment reference"); }
  }

  const handleCheckout = async () => {
    if (!validateBilling()) return;
    setProcessing(true);
    try {
      const result = await new Promise<{ id: number }>((resolve, reject) => {
        createOrderMutation.mutate({
          data: {
            paymentMethod,
            couponCode: couponApplied && couponCode ? couponCode : undefined,
            shippingName: `${billing.firstName} ${billing.lastName}`.trim(),
            shippingAddress: billing.address,
            shippingCity: billing.city,
            shippingPhone: billing.phone,
            items: cart.items.map(item => ({ productVariantId: item.variantId, quantity: item.quantity })),
          }
        }, {
          onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
            qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
            qc.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
            qc.invalidateQueries({ queryKey: getGetVendorSummaryQueryKey() });
            qc.invalidateQueries({ queryKey: getGetOrderStatusBreakdownQueryKey() });
            qc.invalidateQueries({ queryKey: getGetSalesTimelineQueryKey({ period: "month" }) });
            resolve(data as unknown as { id: number });
          },
          onError: reject,
        });
      });

      if (isPaymob) {
        const checkoutUrl = await initiatePaymob(result.id);
        window.location.href = checkoutUrl;
      } else {
        if (isManual) await submitManualPayment(result.id);
        toast({ title: t("checkout.successTitle"), description: t("checkout.successDesc") });
        setLocation(`/order/${result.id}/tracking`);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Checkout failed";
      toast({ title: t("checkout.failTitle"), description: msg, variant: "destructive" });
      setProcessing(false);
    }
  };

  const paymentOptions: Array<{ id: PaymentMethod; label: string; description: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; enabled: boolean }> = [
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

  const LuxuryField = ({ label, field, placeholder, type = "text" }: { label: string; field: keyof typeof billing; placeholder: string; type?: string }) => (
    <div>
      <label className="velora-label block mb-3">{label} *</label>
      <input
        id={field}
        type={type}
        value={billing[field]}
        onChange={e => {
          setBilling(b => ({ ...b, [field]: e.target.value }));
          if (billingErrors[field]) setBillingErrors(prev => ({ ...prev, [field]: undefined }));
        }}
        placeholder={placeholder}
        className={`w-full h-12 border bg-transparent px-4 text-sm focus:outline-none focus:border-foreground transition-colors ${billingErrors[field] ? "border-destructive" : "border-border"}`}
      />
      {billingErrors[field] && <p className="velora-label text-destructive mt-2">{billingErrors[field]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <Link href="/" className="inline-block velora-heading text-3xl hover:opacity-70 transition-opacity mb-8">
            VELORA
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-8">Checkout</h1>
          
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            {[
              { n: 1, label: "Shipping" },
              { n: 2, label: "Payment" },
              { n: 3, label: "Review" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                    step > n ? "bg-foreground border-foreground text-background" :
                    step === n ? "border-foreground text-foreground" :
                    "border-border text-muted-foreground"
                  }`}>
                    {step > n ? <Check className="w-4 h-4" /> : <span className="text-sm font-serif">{n}</span>}
                  </div>
                  <span className={`velora-label ${step >= n ? "text-foreground" : "text-muted-foreground"} hidden md:inline`}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className={`w-12 h-px ${step > n ? "bg-foreground" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* Main Content Area */}
          <div className="lg:col-span-7">
            
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="animate-in fade-in duration-500">
                <h2 className="font-serif text-2xl font-bold mb-8 pb-4 border-b border-border">{t("checkout.shippingInfo")}</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <LuxuryField label={t("checkout.firstName")} field="firstName" placeholder="John" />
                    <LuxuryField label={t("checkout.lastName")} field="lastName" placeholder="Doe" />
                  </div>
                  <LuxuryField label={t("checkout.address")} field="address" placeholder="123 Fashion St, Apt 4B" />
                  <div className="grid grid-cols-2 gap-6">
                    <LuxuryField label={t("checkout.city")} field="city" placeholder="Cairo" />
                    <LuxuryField label={t("checkout.phone")} field="phone" placeholder="+20 100 000 0000" type="tel" />
                  </div>
                </div>
                <div className="mt-12">
                  <button className="velora-btn-primary w-full h-14 justify-center" onClick={advanceToStep2}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                  <h2 className="font-serif text-2xl font-bold">{t("checkout.paymentMethod")}</h2>
                  <button onClick={() => setStep(1)} className="velora-link text-muted-foreground">Edit Shipping</button>
                </div>
                
                <div className="space-y-4 mb-12">
                  {paymentOptions.map(opt => {
                    const Icon = opt.icon;
                    const isActive = paymentMethod === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { setPaymentMethod(opt.id); setReferenceNumber(""); }}
                        className={`flex items-center gap-6 p-6 border cursor-pointer transition-colors ${isActive ? "border-foreground bg-secondary" : "border-border hover:border-foreground/30"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isActive ? "border-foreground bg-foreground" : "border-border"}`}>
                          {isActive && <div className="w-2 h-2 rounded-full bg-background" />}
                        </div>
                        <div className="flex-1">
                          <p className="velora-label text-foreground mb-1">{opt.label}</p>
                          <p className="text-sm text-muted-foreground">{opt.description}</p>
                        </div>
                        <Icon className={`w-6 h-6 shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground/30"}`} strokeWidth={1} />
                      </div>
                    );
                  })}
                </div>

                {isManual && accountInfo && (
                  <div className="mb-12 p-8 border border-border bg-secondary space-y-6">
                    <div>
                      <p className="velora-label text-muted-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> {t("checkout.manualAccountInfo")}</p>
                      <p className="font-serif text-2xl font-bold tracking-wider">{accountInfo}</p>
                    </div>
                    <div className="pt-6 border-t border-border">
                      <label className="velora-label text-foreground block mb-3">{t("checkout.manualReference")}</label>
                      <input
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        placeholder={t("checkout.manualReferencePlaceholder")}
                        className="w-full h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:border-foreground transition-colors"
                      />
                      <p className="text-xs text-muted-foreground mt-2">{t("checkout.manualReferenceHint")}</p>
                    </div>
                  </div>
                )}

                <div className="mb-12 border-t border-border pt-12">
                  <label className="velora-label text-foreground block mb-3">{t("checkout.couponCode")}</label>
                  <div className="flex gap-0">
                    <input
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (couponApplied) { setCouponApplied(false); setCouponData(null); }
                        setCouponError("");
                      }}
                      placeholder={t("checkout.enterCoupon")}
                      className={`flex-1 h-12 border bg-transparent px-4 text-sm font-medium tracking-widest uppercase focus:outline-none focus:border-foreground transition-colors border-r-0 ${couponError ? "border-destructive" : couponApplied ? "border-[#C9A227]" : "border-border"}`}
                      disabled={processing}
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={!couponCode.trim() || processing}
                      className="px-8 bg-foreground text-background h-12 velora-label text-xs hover:bg-[#C9A227] transition-colors disabled:opacity-50"
                    >
                      {t("btn.apply")}
                    </button>
                  </div>
                  {couponError && <p className="velora-label text-destructive mt-3">{couponError}</p>}
                  {couponApplied && couponData && (
                    <p className="velora-label text-[#C9A227] mt-3 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {t("checkout.couponApplied")} {couponData.discountType === "percentage" ? `${couponData.discountValue}%` : `${couponData.discountValue} EGP`} {t("checkout.off")}
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="velora-btn-outline flex-1 h-14 justify-center">
                    Back
                  </button>
                  <button className="velora-btn-primary flex-[2] h-14 justify-center" onClick={advanceToStep3}>
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                  <h2 className="font-serif text-2xl font-bold">Review Order</h2>
                </div>

                <div className="space-y-12 mb-12">
                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <p className="velora-label text-muted-foreground">Order Items</p>
                      <Link href="/cart" className="velora-link text-muted-foreground">Edit Bag</Link>
                    </div>
                    <div className="space-y-4">
                      {cart.items.map(item => (
                        <div key={item.variantId} className="flex gap-6 pb-6 border-b border-border">
                          <div className="w-20 bg-muted shrink-0 aspect-[3/4] overflow-hidden">
                            {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-serif text-xl font-bold mb-2">{language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                              {[item.color, item.size].filter(Boolean).join(" · ")}
                            </p>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">QTY: {item.quantity}</span>
                              <span className="font-medium">{(Number(item.salePrice || item.price) * item.quantity).toLocaleString()} EGP</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid md:grid-cols-2 gap-8 pt-4">
                    <div className="border border-border p-6 bg-secondary">
                      <div className="flex justify-between items-center mb-6">
                        <p className="velora-label text-muted-foreground">Shipping To</p>
                        <button onClick={() => setStep(1)} className="velora-link text-muted-foreground">Edit</button>
                      </div>
                      <div className="space-y-1 text-sm leading-relaxed">
                        <p className="font-medium">{billing.firstName} {billing.lastName}</p>
                        <p className="text-muted-foreground">{billing.address}</p>
                        <p className="text-muted-foreground">{billing.city}</p>
                        <p className="text-muted-foreground pt-2">{billing.phone}</p>
                      </div>
                    </div>

                    <div className="border border-border p-6 bg-secondary">
                      <div className="flex justify-between items-center mb-6">
                        <p className="velora-label text-muted-foreground">Payment</p>
                        <button onClick={() => setStep(2)} className="velora-link text-muted-foreground">Edit</button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium capitalize">{paymentMethod.replace(/_/g, " ")}</p>
                        {isManual && referenceNumber && (
                          <p className="text-muted-foreground">Ref: {referenceNumber}</p>
                        )}
                        {couponApplied && couponCode && (
                          <p className="text-[#C9A227] font-medium pt-2">Code: {couponCode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} disabled={processing} className="velora-btn-outline flex-1 h-14 justify-center disabled:opacity-50">
                    Back
                  </button>
                  <button
                    className="velora-btn-primary flex-[2] h-14 justify-center"
                    onClick={handleCheckout}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : t("btn.placeOrder")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-5 hidden lg:block">
             <div className="bg-secondary p-8 border border-border sticky top-32">
              <h2 className="velora-label border-b border-border pb-4 mb-8 text-foreground">{t("cart.orderSummary")}</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.subtotal")}</span>
                  <span className="font-medium">{cartSubtotal.toLocaleString()} EGP</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-destructive">
                    <span className="uppercase tracking-widest text-[10px]">{t("common.discount")}</span>
                    <span>−{discount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.shipping")}</span>
                  <span className="velora-label text-[#C9A227]">{t("common.free")}</span>
                </div>
              </div>

              <div className="border-t border-border pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="velora-label text-foreground">{t("common.total")}</span>
                  <span className="font-serif text-3xl font-bold">{total.toLocaleString()} EGP</span>
                </div>
              </div>

              {step < 3 && (
                <div className="border border-border p-4 bg-muted/10 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest leading-loose">
                    Complete all steps to place your order.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
