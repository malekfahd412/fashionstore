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
    <div className="space-y-2">
      <label className="velora-label text-muted-foreground/60">{label}</label>
      <input
        id={field}
        type={type}
        value={billing[field]}
        onChange={e => {
          setBilling(b => ({ ...b, [field]: e.target.value }));
          if (billingErrors[field]) setBillingErrors(prev => ({ ...prev, [field]: undefined }));
        }}
        placeholder={placeholder}
        className={`w-full h-12 bg-transparent border-b px-0 text-sm tracking-wide focus:outline-none focus:border-accent transition-all duration-300 placeholder:text-muted-foreground/20 ${billingErrors[field] ? "border-destructive" : "border-border/60"}`}
      />
      {billingErrors[field] && <p className="text-[10px] text-destructive uppercase tracking-widest mt-2">{billingErrors[field]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-32 pb-32">
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
        
        {/* Header */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8">
            <div>
              <Link href="/" className="inline-block velora-heading text-xl md:text-2xl hover:text-accent transition-colors mb-6 tracking-widest">
                VELORA
              </Link>
              <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight">Checkout</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {[
                { n: 1, label: "Shipping" },
                { n: 2, label: "Payment" },
                { n: 3, label: "Review" },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center border transition-all duration-500 ${
                      step > n ? "bg-foreground border-foreground text-background" :
                      step === n ? "border-accent text-accent" :
                      "border-border/40 text-muted-foreground/40"
                    }`}>
                      {step > n ? <Check className="w-4 h-4" /> : <span className="velora-label text-[10px]">{n}</span>}
                    </div>
                    <span className={`velora-label text-[9px] ${step >= n ? "text-foreground" : "text-muted-foreground/40"} hidden xl:inline`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div className={`w-8 md:w-16 h-px transition-colors duration-500 ${step > n ? "bg-foreground" : "bg-border/40"}`} />}
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-border w-full" />
        </div>

        <div className="grid lg:grid-cols-12 gap-20">
          
          {/* Main Content Area */}
          <div className="lg:col-span-7">
            
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="velora-label text-muted-foreground/60 mb-12 tracking-[0.4em]">{t("checkout.shippingInfo")}</h2>
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-10">
                    <LuxuryField label={t("checkout.firstName")} field="firstName" placeholder="First Name" />
                    <LuxuryField label={t("checkout.lastName")} field="lastName" placeholder="Last Name" />
                  </div>
                  <LuxuryField label={t("checkout.address")} field="address" placeholder="123 Avenue Montaigne" />
                  <div className="grid grid-cols-2 gap-10">
                    <LuxuryField label={t("checkout.city")} field="city" placeholder="City" />
                    <LuxuryField label={t("checkout.phone")} field="phone" placeholder="+20 100 000 0000" type="tel" />
                  </div>
                </div>
                <div className="mt-20">
                  <button className="velora-btn-primary w-full h-16 justify-center text-[10px] tracking-[0.4em]" onClick={advanceToStep2}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-12">
                  <h2 className="velora-label text-muted-foreground/60 tracking-[0.4em]">{t("checkout.paymentMethod")}</h2>
                  <button onClick={() => setStep(1)} className="velora-link text-muted-foreground/40 hover:text-foreground">Edit Shipping</button>
                </div>
                
                <div className="grid gap-4 mb-16">
                  {paymentOptions.map(opt => {
                    const Icon = opt.icon;
                    const isActive = paymentMethod === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { setPaymentMethod(opt.id); setReferenceNumber(""); }}
                        className={`group flex items-center gap-8 p-8 border transition-all duration-300 cursor-pointer ${isActive ? "border-accent bg-secondary/20" : "border-border/40 hover:border-accent/40"}`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isActive ? "border-accent bg-accent" : "border-border/40"}`}>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                        </div>
                        <div className="flex-1">
                          <p className="velora-label text-foreground mb-1 tracking-[0.2em]">{opt.label}</p>
                          <p className="text-[11px] font-light text-muted-foreground leading-relaxed">{opt.description}</p>
                        </div>
                        <Icon className={`w-5 h-5 shrink-0 transition-all duration-500 ${isActive ? "text-accent scale-110" : "text-muted-foreground/20 group-hover:text-muted-foreground/40"}`} strokeWidth={1} />
                      </div>
                    );
                  })}
                </div>

                {isManual && accountInfo && (
                  <div className="mb-16 p-10 border border-border/40 bg-secondary/10 space-y-10 animate-in fade-in duration-700">
                    <div className="space-y-4">
                      <p className="velora-label text-muted-foreground/60 tracking-[0.2em] flex items-center gap-3">
                        <FileText className="w-3 h-3" /> {t("checkout.manualAccountInfo")}
                      </p>
                      <p className="font-serif text-3xl font-medium tracking-tight text-accent">{accountInfo}</p>
                    </div>
                    <div className="pt-10 border-t border-border/40 space-y-4">
                      <label className="velora-label text-muted-foreground/60 tracking-[0.2em] block">{t("checkout.manualReference")}</label>
                      <input
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        placeholder={t("checkout.manualReferencePlaceholder")}
                        className="w-full h-12 bg-transparent border-b border-border/60 px-0 text-sm focus:outline-none focus:border-accent transition-all placeholder:text-muted-foreground/20"
                      />
                      <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">{t("checkout.manualReferenceHint")}</p>
                    </div>
                  </div>
                )}

                <div className="mb-16 border-t border-border/40 pt-16">
                  <label className="velora-label text-muted-foreground/60 tracking-[0.2em] block mb-6">{t("checkout.couponCode")}</label>
                  <div className="flex gap-0 group">
                    <input
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (couponApplied) { setCouponApplied(false); setCouponData(null); }
                        setCouponError("");
                      }}
                      placeholder={t("checkout.enterCoupon")}
                      className={`flex-1 h-12 bg-transparent border-b px-0 text-sm font-medium tracking-widest uppercase focus:outline-none focus:border-accent transition-all border-r-0 ${couponError ? "border-destructive" : couponApplied ? "border-accent" : "border-border/60"}`}
                      disabled={processing}
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={!couponCode.trim() || processing}
                      className="px-10 bg-foreground text-background h-12 velora-label text-[10px] hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {t("btn.apply")}
                    </button>
                  </div>
                  {couponError && <p className="velora-label text-destructive/80 mt-4 tracking-widest">{couponError}</p>}
                  {couponApplied && couponData && (
                    <p className="velora-label text-accent mt-4 flex items-center gap-3 animate-in fade-in duration-500">
                      <Check className="w-3 h-3" />
                      {t("checkout.couponApplied")} {couponData.discountType === "percentage" ? `${couponData.discountValue}%` : `${couponData.discountValue} EGP`} {t("checkout.off")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <button onClick={() => setStep(1)} className="velora-btn-outline flex-1 h-16 justify-center text-[10px] tracking-[0.4em]">
                    Back
                  </button>
                  <button className="velora-btn-primary flex-[2] h-16 justify-center text-[10px] tracking-[0.4em]" onClick={advanceToStep3}>
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-12">
                  <h2 className="velora-label text-muted-foreground/60 tracking-[0.4em]">Review Order</h2>
                  <button onClick={() => setStep(2)} className="velora-link text-muted-foreground/40 hover:text-foreground">Change Payment</button>
                </div>

                <div className="space-y-16">
                  {/* Items */}
                  <div>
                    <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-border/40">
                      <p className="velora-label text-muted-foreground/60 tracking-[0.2em]">Order Items</p>
                      <Link href="/cart" className="velora-link text-[8px] text-muted-foreground/40 hover:text-foreground">Edit Bag</Link>
                    </div>
                    <div className="space-y-10">
                      {cart.items.map(item => (
                        <div key={item.variantId} className="flex gap-8 group animate-in fade-in duration-700">
                          <div className="w-24 bg-secondary shrink-0 aspect-[3/4] overflow-hidden">
                            {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />}
                          </div>
                          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                            <div>
                              <p className="font-serif text-2xl mb-2 tracking-tight">{language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}</p>
                              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-light">
                                {[item.color, item.size].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">QTY: {item.quantity}</span>
                              <span className="font-medium">{(Number(item.salePrice || item.price) * item.quantity).toLocaleString()} EGP</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="border border-border/40 p-10 bg-secondary/10">
                      <div className="flex justify-between items-baseline mb-8">
                        <p className="velora-label text-muted-foreground/60 tracking-[0.2em]">Shipping To</p>
                        <button onClick={() => setStep(1)} className="velora-link text-[8px] text-muted-foreground/40">Edit</button>
                      </div>
                      <div className="space-y-2 text-sm font-light leading-relaxed">
                        <p className="font-medium tracking-tight uppercase text-[10px]">{billing.firstName} {billing.lastName}</p>
                        <p className="text-muted-foreground">{billing.address}</p>
                        <p className="text-muted-foreground">{billing.city}</p>
                        <p className="text-muted-foreground pt-2">{billing.phone}</p>
                      </div>
                    </div>
                    <div className="border border-border/40 p-10 bg-secondary/10">
                      <div className="flex justify-between items-baseline mb-8">
                        <p className="velora-label text-muted-foreground/60 tracking-[0.2em]">Payment Method</p>
                        <button onClick={() => setStep(2)} className="velora-link text-[8px] text-muted-foreground/40">Edit</button>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-medium">{paymentOptions.find(o => o.id === paymentMethod)?.label}</p>
                        {isManual && referenceNumber && (
                          <div className="space-y-1">
                            <p className="velora-label text-[8px] text-muted-foreground/40">Reference</p>
                            <p className="text-xs font-mono">{referenceNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border/40">
                    <button
                      className="velora-btn-primary w-full h-16 justify-center text-[10px] tracking-[0.4em] disabled:opacity-50"
                      onClick={handleCheckout}
                      disabled={processing}
                    >
                      {processing ? "PROCESSING..." : "PLACE ORDER"}
                    </button>
                    <p className="text-[9px] text-center text-muted-foreground/40 uppercase tracking-widest mt-6">
                      By placing this order you agree to our <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Sticky Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-32 space-y-10 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="bg-foreground text-background p-10 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 -mr-16 -mt-16 rounded-full blur-3xl" />
                
                <h2 className="velora-label text-accent tracking-[0.4em] mb-12 relative z-10">{t("cart.orderSummary")}</h2>
                
                <div className="space-y-6 mb-12 relative z-10">
                  <div className="flex justify-between text-xs font-light">
                    <span className="text-background/50 uppercase tracking-widest">{t("common.subtotal")}</span>
                    <span className="tracking-tight">{cartSubtotal.toLocaleString()} EGP</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs font-light">
                      <span className="text-accent uppercase tracking-widest">Discount</span>
                      <span className="text-accent tracking-tight">−{discount.toLocaleString()} EGP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-light">
                    <span className="text-background/50 uppercase tracking-widest">{t("common.shipping")}</span>
                    <span className="text-accent uppercase tracking-widest font-medium">{t("common.free")}</span>
                  </div>
                </div>

                <div className="pt-10 border-t border-background/10 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="velora-label text-accent tracking-[0.4em] mb-1">{t("common.total")}</span>
                    <span className="font-serif text-5xl font-medium tracking-tight text-background">
                      {total.toLocaleString()} <span className="text-sm font-sans font-light text-background/40 ml-1">EGP</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border/40 p-6 flex flex-col items-center justify-center text-center gap-3 group hover:border-accent/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-secondary/40 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-colors duration-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <p className="velora-label text-[8px] text-muted-foreground/60 tracking-[0.2em]">Free Express Shipping</p>
                </div>
                <div className="border border-border/40 p-6 flex flex-col items-center justify-center text-center gap-3 group hover:border-accent/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-secondary/40 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-colors duration-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <p className="velora-label text-[8px] text-muted-foreground/60 tracking-[0.2em]">14-Day Boutique Returns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
