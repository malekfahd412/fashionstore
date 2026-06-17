import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetCart, useCreateOrder, getGetCartQueryKey, getListOrdersQueryKey, getGetAnalyticsSummaryQueryKey, getGetVendorSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getGetSalesTimelineQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border border-black/20 border-t-black/60 rounded-full animate-spin" />
      </div>
    );
  }
  if (!cart || !cart.items?.length) { setLocation("/cart"); return null; }

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

  const paymentOptions: Array<{ id: PaymentMethod; label: string; description: string; icon: React.ComponentType<{ className?: string }>; enabled: boolean }> = [
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

  const LuxuryField = ({ label, field, placeholder, type = "text" }: {
    label: string; field: keyof typeof billing; placeholder: string; type?: string;
  }) => (
    <div>
      <label className="block text-[9px] font-bold tracking-[0.3em] uppercase text-black/40 mb-2">
        {label} <span className="text-[#C9A227]">*</span>
      </label>
      <input
        id={field}
        type={type}
        value={billing[field]}
        onChange={e => {
          setBilling(b => ({ ...b, [field]: e.target.value }));
          if (billingErrors[field]) setBillingErrors(prev => ({ ...prev, [field]: undefined }));
        }}
        placeholder={placeholder}
        className={`w-full h-12 border bg-[#F7F6F4] px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors tracking-wide ${billingErrors[field] ? "border-red-400" : "border-black/10"}`}
      />
      {billingErrors[field] && (
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-red-500 mt-1.5">{billingErrors[field]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-[1fr_380px] gap-16 py-12 md:py-20">

          {/* ── Left: Steps ─────────────────────────────────────────────── */}
          <div>
            {/* Title + progress */}
            <div className="mb-12">
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-4">Velora</p>
              <h1
                className="text-4xl md:text-5xl font-bold text-[#111111] mb-10 leading-[0.92]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Checkout
              </h1>

              {/* Step indicators */}
              <div className="flex items-center gap-0">
                {[
                  { n: 1, label: "Shipping" },
                  { n: 2, label: "Payment" },
                  { n: 3, label: "Review" },
                ].map(({ n, label }, i) => (
                  <div key={n} className="flex items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 flex items-center justify-center text-[9px] font-bold border transition-colors ${
                        step > n ? "bg-[#C9A227] border-[#C9A227] text-white" :
                        step === n ? "bg-[#111111] border-[#111111] text-white" :
                        "border-black/15 text-black/25"
                      }`}>
                        {step > n ? <Check className="w-3 h-3" /> : n}
                      </div>
                      <span className={`text-[9px] font-bold tracking-[0.22em] uppercase ${step >= n ? "text-[#111111]" : "text-black/25"}`}>
                        {label}
                      </span>
                    </div>
                    {i < 2 && <div className={`w-10 h-[1px] mx-4 ${step > n ? "bg-[#C9A227]" : "bg-black/10"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: SHIPPING */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                <h2 className="text-lg font-bold text-[#111111] mb-8 pb-5 border-b border-black/6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {t("checkout.shippingInfo")}
                </h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <LuxuryField label={t("checkout.firstName")} field="firstName" placeholder={language === "ar" ? "محمد" : "John"} />
                    <LuxuryField label={t("checkout.lastName")} field="lastName" placeholder={language === "ar" ? "أحمد" : "Doe"} />
                  </div>
                  <LuxuryField label={t("checkout.address")} field="address" placeholder={language === "ar" ? "١٢٣ شارع الأزياء" : "123 Fashion St"} />
                  <div className="grid grid-cols-2 gap-4">
                    <LuxuryField label={t("checkout.city")} field="city" placeholder={language === "ar" ? "القاهرة" : "Cairo"} />
                    <LuxuryField label={t("checkout.phone")} field="phone" placeholder="+20 100 000 0000" type="tel" />
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-black/6 flex justify-end">
                  <button
                    className="flex items-center gap-3 bg-[#111111] text-white px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300"
                    onClick={advanceToStep2}
                  >
                    Continue to Payment <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-black/6">
                  <h2 className="text-lg font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {t("checkout.paymentMethod")}
                  </h2>
                  <button onClick={() => setStep(1)} className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-black transition-colors border-b border-black/15 pb-0.5">
                    Edit Shipping
                  </button>
                </div>

                <div className="space-y-2.5 mb-10">
                  {paymentOptions.map(opt => {
                    const Icon = opt.icon;
                    const isActive = paymentMethod === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { setPaymentMethod(opt.id); setReferenceNumber(""); }}
                        className={`flex items-center gap-5 border p-5 cursor-pointer transition-all duration-200 ${isActive ? "border-[#111111] bg-[#F7F6F4]" : "border-black/8 hover:border-black/25"}`}
                      >
                        <div className={`w-4 h-4 border shrink-0 flex items-center justify-center ${isActive ? "border-[#111111] bg-[#111111]" : "border-black/25"}`}>
                          {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#111111]">{opt.label}</p>
                          <p className="text-[10px] text-black/38 mt-0.5 tracking-wide">{opt.description}</p>
                        </div>
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#111111]" : "text-black/25"}`} />
                      </div>
                    );
                  })}
                </div>

                {isManual && accountInfo && (
                  <div className="mb-10 p-6 bg-[#F7F6F4] border border-black/8 space-y-5">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/35 mb-2 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> {t("checkout.manualAccountInfo")}</p>
                      <p className="font-mono text-2xl font-bold text-[#111111] tracking-wider">{accountInfo}</p>
                    </div>
                    <div className="pt-4 border-t border-black/8">
                      <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/40 mb-2 block">{t("checkout.manualReference")}</label>
                      <input
                        value={referenceNumber}
                        onChange={e => setReferenceNumber(e.target.value)}
                        placeholder={t("checkout.manualReferencePlaceholder")}
                        className="w-full h-11 border border-black/10 bg-white px-4 text-sm focus:outline-none focus:border-[#111111] transition-colors tracking-wide"
                      />
                      <p className="text-[9px] text-black/35 mt-1.5 tracking-wide">{t("checkout.manualReferenceHint")}</p>
                    </div>
                  </div>
                )}

                {/* Coupon */}
                <div className="mb-10">
                  <label className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/40 mb-3 block">{t("checkout.couponCode")}</label>
                  <div className="flex gap-0">
                    <input
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value.toUpperCase());
                        if (couponApplied) { setCouponApplied(false); setCouponData(null); }
                        setCouponError("");
                      }}
                      placeholder={t("checkout.enterCoupon")}
                      className={`flex-1 h-11 border border-r-0 bg-[#F7F6F4] px-4 text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-[#111111] transition-colors ${couponError ? "border-red-400" : couponApplied ? "border-[#C9A227]" : "border-black/10"}`}
                      disabled={processing}
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={!couponCode.trim() || processing}
                      className="h-11 px-6 bg-[#111111] text-white text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#C9A227] transition-colors disabled:opacity-30"
                    >
                      {t("btn.apply")}
                    </button>
                  </div>
                  {couponError && <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-red-500 mt-2">{couponError}</p>}
                  {couponApplied && couponData && (
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A227] mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t("checkout.couponApplied")} {couponData.discountType === "percentage" ? `${couponData.discountValue}%` : `${couponData.discountValue} EGP`} {t("checkout.off")}
                    </p>
                  )}
                </div>

                <div className="mt-10 pt-6 border-t border-black/6 flex justify-between items-center">
                  <button onClick={() => setStep(1)} className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-black transition-colors">
                    Back
                  </button>
                  <button
                    className="flex items-center gap-3 bg-[#111111] text-white px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300"
                    onClick={advanceToStep3}
                  >
                    Review Order <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-black/6">
                  <h2 className="text-lg font-bold text-[#111111]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    Review Order
                  </h2>
                </div>

                <div className="space-y-8 mb-10">
                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[9px] font-bold tracking-[0.28em] uppercase text-black/38">Order Items</p>
                      <Link href="/cart" className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/38 hover:text-black transition-colors border-b border-black/15 pb-0.5">Edit Bag</Link>
                    </div>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 no-scrollbar">
                      {cart.items.map(item => (
                        <div key={item.variantId} className="flex gap-4 bg-[#F7F6F4] p-3">
                          <div className="w-14 bg-white overflow-hidden shrink-0" style={{ aspectRatio: "3/4" }}>
                            {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-sm font-medium text-[#111111] line-clamp-1 mb-1">{language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}</p>
                            <p className="text-[9px] text-black/35 tracking-[0.18em] uppercase font-bold">{[item.color, item.size].filter(Boolean).join(" · ")} · Qty {item.quantity}</p>
                            <p className="text-sm font-bold text-[#111111] mt-1">{((Number(item.salePrice) || Number(item.price)) * item.quantity).toLocaleString()} EGP</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/38">Shipping To</p>
                        <button onClick={() => setStep(1)} className="text-[9px] font-bold tracking-[0.18em] uppercase text-black/35 hover:text-black border-b border-black/15 pb-0.5">Edit</button>
                      </div>
                      <div className="bg-[#F7F6F4] p-4 text-xs text-[#111111] leading-relaxed tracking-wide">
                        {billing.firstName} {billing.lastName}<br />
                        {billing.address}<br />
                        {billing.city}<br />
                        {billing.phone}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-black/38">Payment</p>
                        <button onClick={() => setStep(2)} className="text-[9px] font-bold tracking-[0.18em] uppercase text-black/35 hover:text-black border-b border-black/15 pb-0.5">Edit</button>
                      </div>
                      <div className="bg-[#F7F6F4] p-4 text-xs text-[#111111] tracking-[0.15em] uppercase font-bold">
                        {paymentOptions.find(o => o.id === paymentMethod)?.label}
                        {isManual && referenceNumber && <span className="block text-[9px] font-normal normal-case mt-1 text-black/40 tracking-wide">Ref: {referenceNumber}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-black/6 flex justify-between items-center">
                  <button onClick={() => setStep(2)} className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-black transition-colors">Back</button>
                  <button
                    className="flex items-center gap-3 bg-[#111111] text-white px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300 disabled:opacity-40"
                    onClick={handleCheckout}
                    disabled={processing || createOrderMutation.isPending}
                  >
                    {processing ? (
                      <span className="flex items-center gap-3">
                        <span className="w-4 h-4 border border-white/40 border-t-white rounded-full animate-spin" />
                        {isPaymob ? t("btn.redirectingToPaymob") : t("checkout.processing")}
                      </span>
                    ) : isPaymob ? t("btn.payWithPaymob") : t("btn.placeOrder")}
                  </button>
                </div>
                <p className="text-[9px] text-black/25 text-center mt-6 tracking-[0.18em] uppercase font-bold">{t("checkout.terms")}</p>
              </div>
            )}
          </div>

          {/* ── Right: Order Summary ─────────────────────────────────────── */}
          <div className="lg:border-l lg:border-black/6 lg:ps-16 py-12 md:py-20">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-black/30 mb-6">Order Summary</p>

            {/* Items */}
            <div className="space-y-5 mb-8 pb-8 border-b border-black/6">
              {cart.items.map(item => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="w-14 bg-[#F7F6F4] overflow-hidden shrink-0 relative" style={{ aspectRatio: "3/4" }}>
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute -top-1.5 -end-1.5 w-5 h-5 bg-[#111111] text-white text-[9px] font-bold flex items-center justify-center">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-xs font-medium text-[#111111] leading-snug mb-1 line-clamp-2">{language === "en" ? item.nameEn : (item.nameAr || item.nameEn)}</p>
                    {(item.color || item.size) && <p className="text-[9px] text-black/30 tracking-[0.15em] uppercase font-bold">{[item.color, item.size].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#111111]">{((Number(item.salePrice) || Number(item.price)) * item.quantity).toLocaleString()} EGP</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/38">{t("common.subtotal")}</span>
                <span className="font-medium text-[#111111]">{cartSubtotal.toFixed(2)} EGP</span>
              </div>
              {couponApplied && discount > 0 && (
                <div className="flex justify-between text-[#C9A227]">
                  <span className="text-[9px] font-bold tracking-[0.22em] uppercase">{t("checkout.discountLabel")}</span>
                  <span className="font-bold">−{discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-black/38">{t("common.shipping")}</span>
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#C9A227]">{t("common.free")}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-black/8 mt-2">
                <span
                  className="text-base font-bold text-[#111111]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("common.total")}
                </span>
                <span
                  className="text-xl font-bold text-[#111111]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {total.toFixed(2)} EGP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
